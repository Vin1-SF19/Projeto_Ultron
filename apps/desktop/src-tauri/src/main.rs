// Previne o console extra do Windows em release, sem afetar outras plataformas.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ultron_desktop_lib::run();
}
