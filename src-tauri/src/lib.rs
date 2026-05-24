use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::OnceLock,
};

static DEBUG_CONSOLE_ENABLED: OnceLock<bool> = OnceLock::new();

#[derive(serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ReadingStateStore {
    files: HashMap<String, usize>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedFile {
    content: String,
    file_name: String,
    file_path: String,
    resume_index: usize,
}

fn debug_console_enabled() -> bool {
    *DEBUG_CONSOLE_ENABLED.get_or_init(|| {
        let enabled = std::env::args().any(|arg| arg == "-d" || arg == "-debug");
        #[cfg(target_os = "windows")]
        if enabled {
            attach_debug_console();
        }
        enabled
    })
}

#[cfg(target_os = "windows")]
fn attach_debug_console() {
    use windows_sys::Win32::System::Console::{
        AllocConsole, AttachConsole, ATTACH_PARENT_PROCESS,
    };

    unsafe {
        if AttachConsole(ATTACH_PARENT_PROCESS) == 0 {
            let _ = AllocConsole();
        }
    }
}

fn debug_log(message: &str) {
    if !debug_console_enabled() {
        return;
    }

    #[cfg(target_os = "windows")]
    write_windows_console(message);

    #[cfg(not(target_os = "windows"))]
    println!("{}", message);
}

#[cfg(target_os = "windows")]
fn write_windows_console(message: &str) {
    use windows_sys::Win32::System::Console::{
        GetStdHandle, WriteConsoleW, STD_OUTPUT_HANDLE,
    };

    let mut utf16: Vec<u16> = message.encode_utf16().collect();
    utf16.push('\n' as u16);

    unsafe {
        let handle = GetStdHandle(STD_OUTPUT_HANDLE);
        if handle.is_null() || handle == (-1_isize) as *mut std::ffi::c_void {
            return;
        }

        let mut written = 0;
        let _ = WriteConsoleW(
            handle,
            utf16.as_ptr() as _,
            utf16.len() as u32,
            &mut written,
            std::ptr::null_mut(),
        );
    }
}

fn log_backend_error(context: &str, error: &str) {
    debug_log(&format!("[backend] {}: {}", context, error));
}

fn log_backend_info(message: &str) {
    debug_log(&format!("[backend] {}", message));
}

fn reading_state_path() -> PathBuf {
    std::env::temp_dir().join("word-focus-reading-state.json")
}

fn load_reading_state_store() -> ReadingStateStore {
    let path = reading_state_path();
    let content = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => return ReadingStateStore::default(),
    };

    serde_json::from_str(&content).unwrap_or_default()
}

fn save_reading_state_store(store: &ReadingStateStore) -> Result<(), String> {
    let path = reading_state_path();
    let content = serde_json::to_string(store)
        .map_err(|error| format!("Failed to serialize reading state: {}", error))?;

    fs::write(path, content).map_err(|error| format!("Failed to write reading state: {}", error))
}

fn load_saved_index(file_path: &str) -> usize {
    load_reading_state_store()
        .files
        .get(file_path)
        .copied()
        .unwrap_or(0)
}

#[tauri::command]
fn open_file(app: tauri::AppHandle) -> Result<OpenedFile, String> {
    use tauri_plugin_dialog::DialogExt;

    let file = app
        .dialog()
        .file()
        .add_filter("Readable Files", &["txt", "md", "epub", "epub3", "pdf"])
        .blocking_pick_file();

    match file {
        Some(path) => {
            let path_buf = path.as_path().ok_or_else(|| {
                let error = "Invalid file path".to_string();
                log_backend_error("open_file", &error);
                error
            })?;
            let ext = path_buf
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            let file_path = path_buf.to_string_lossy().to_string();

            log_backend_info(&format!("Opening file: {}", path_buf.display()));

            let result = if ext == "epub" || ext == "epub3" {
                extract_epub_text(&path_buf)
            } else if ext == "pdf" {
                extract_pdf_text(&path_buf)
            } else {
                std::fs::read_to_string(&path_buf)
                    .map_err(|e| format!("Failed to read file: {}", e))
            };

            if let Err(error) = &result {
                log_backend_error("open_file", error);
            }

            result.map(|content| OpenedFile {
                content,
                file_name: path_buf
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or("Unknown file")
                    .to_string(),
                file_path: file_path.clone(),
                resume_index: load_saved_index(&file_path),
            })
        }
        None => {
            let error = "No file selected".to_string();
            log_backend_error("open_file", &error);
            Err(error)
        }
    }
}

#[tauri::command]
fn log_frontend_error(message: String) {
    debug_log(&format!("[frontend] {}", message));
}

#[tauri::command]
fn save_reading_state(file_path: String, current_index: usize) -> Result<(), String> {
    let mut store = load_reading_state_store();
    store.files.insert(file_path, current_index);
    save_reading_state_store(&store)
}

fn extract_epub_text(path: &Path) -> Result<String, String> {
    let mut doc =
        epub::doc::EpubDoc::new(path).map_err(|e| format!("Failed to open EPUB: {}", e))?;

    let mut text = String::new();
    loop {
        match doc.get_current_str() {
            Ok(chapter) => {
                let plain = strip_html(&chapter);
                text.push_str(&plain);
                text.push('\n');
            }
            Err(_) => break,
        }
        if doc.go_next().is_err() {
            break;
        }
    }

    if text.trim().is_empty() {
        Err("No readable content found in EPUB".to_string())
    } else {
        Ok(text)
    }
}

fn extract_pdf_text(path: &Path) -> Result<String, String> {
    let text = pdf_extract::extract_text(path)
        .map_err(|e| format!("Failed to extract PDF text: {}", e))?;

    if text.trim().is_empty() {
        Err("No readable text found in PDF".to_string())
    } else {
        Ok(text)
    }
}

fn strip_html(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    let mut in_entity = false;
    let mut entity = String::new();

    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            '&' => {
                in_entity = true;
                entity.clear();
            }
            ';' if in_entity => {
                in_entity = false;
                let decoded = match entity.as_str() {
                    "amp" => "&",
                    "lt" => "<",
                    "gt" => ">",
                    "quot" => "\"",
                    "apos" => "'",
                    "nbsp" => " ",
                    "mdash" => "\u{2014}",
                    "ndash" => "\u{2013}",
                    "emsp" => " ",
                    "ensp" => " ",
                    _ => "",
                };
                result.push_str(decoded);
            }
            _ if in_entity => entity.push(c),
            _ if !in_tag && !in_entity => result.push(c),
            _ => {}
        }
    }

    let mut normalized = String::new();
    let mut prev_space = false;
    for c in result.chars() {
        if c.is_whitespace() {
            if !prev_space {
                normalized.push(' ');
                prev_space = true;
            }
        } else {
            normalized.push(c);
            prev_space = false;
        }
    }

    normalized.trim().to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let debug_console = debug_console_enabled();

    std::panic::set_hook(Box::new(|panic_info| {
        debug_log(&format!("[backend panic] {}", panic_info));
    }));

    if debug_console {
        log_backend_info("Debug console enabled via -d/-debug");
    }

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![open_file, log_frontend_error, save_reading_state])
        .run(tauri::generate_context!());

    if let Err(error) = app {
        debug_log(&format!("[backend startup] error while running tauri application: {}", error));
        panic!("error while running tauri application: {}", error);
    }
}
