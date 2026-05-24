use std::path::Path;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedFile {
    content: String,
    file_name: String,
}

fn log_backend_error(context: &str, error: &str) {
    eprintln!("[backend] {}: {}", context, error);
}

fn log_backend_info(message: &str) {
    println!("[backend] {}", message);
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
    eprintln!("[frontend] {}", message);
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
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("[backend panic] {}", panic_info);
    }));

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![open_file, log_frontend_error])
        .run(tauri::generate_context!());

    if let Err(error) = app {
        eprintln!("[backend startup] error while running tauri application: {}", error);
        panic!("error while running tauri application: {}", error);
    }
}
