use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};
#[cfg(desktop)]
use tauri_plugin_global_shortcut::GlobalShortcutExt;

const GLOBAL_SHORTCUT: &str = "Ctrl+Shift+L";
const SHORTCUT_EVENT: &str = "global-shortcut";

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        show_main_window(app);
                        let _ = app.emit(
                            SHORTCUT_EVENT,
                            serde_json::json!({ "action": "quick-open" }),
                        );
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Tray icon with a small menu: show window / quit.
            let show = MenuItem::with_id(app, "show", "显示 lifeOS", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("lifeOS")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Global shortcut: Ctrl+Shift+L brings lifeOS to the front.
            #[cfg(desktop)]
            app.global_shortcut().register(GLOBAL_SHORTCUT)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window hides it to the tray; quitting goes through the tray menu.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running lifeOS desktop shell");
}
