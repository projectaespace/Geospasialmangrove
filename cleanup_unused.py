import shutil
from pathlib import Path

base = Path('.')
paths = [
    'COMPLETION_SUMMARY.md','DASHBOARD_ANALYTICS_README.md','DASHBOARD_IMPLEMENTATION.md','DELIVERABLES.md',
    'DOCUMENTATION_GUIDE.md','DOCUMENTATION_INDEX.md','ENHANCEMENT_SUMMARY_V3.md','FILE_MANIFEST.md',
    'FINAL_SUMMARY.md','FIXES_SUMMARY.md','IMPLEMENTATION_GUIDE.md','MAP_COMPLETION_REPORT.md',
    'MAP_FIXED_SUMMARY.md','MAP_REDESIGN_COMPLETION_SUMMARY.md','MAP_REDESIGN_DELIVERY_REPORT.md',
    'MAP_REDESIGN_DOCUMENTATION.md','MAP_REDESIGN_TESTING_GUIDE.md','PANDUAN_TESTING.md',
    'PERBAIKAN_MAP_TERBARU.md','PERUBAHAN_V3.0.md','PROJECT_SUMMARY.md','QUICK_REFERENCE.md',
    'QUICK_START_GUIDE.md','QUICK_TEST.md','README.md','README_DASHBOARD.md','README_MAP_REDESIGN.md',
    'RELEASE_NOTES.md','SETUP_INSTRUCTIONS.md','SUMMARY_FINAL.md','TESTING_GUIDE.md','TODO.md','UPDATE_SUMMARY.md',
    'analyze_excel.ps1','analyze_excel_v2.ps1','debug_rels.txt','error.txt','inspect_dashboard_headers.ps1',
    'inspect_excel_headers.ps1','inspect_excel_headers_debug.ps1','inspect_excel_sharedstrings.ps1',
    'inspect_excel_sharedstrings_range.ps1','inspect_laju_headers.ps1','dep_check.py','dep_check_filtered.py',
    'dep_output.txt','read_unused.py','unused_list.txt','simple-server.js','storymaps.html','dashboard-enhanced.html',
    'index_backup_old.html','index_backup_v2.html','index_old.html','index_updated.html','index_v3_mangrove.html',
    'map_backup_before_fix.html','map_backup_old.html','map_backup_v2.html','map_backup.html','map_complete.html',
    'map_fixed.html','map_old_v2.html','map_redesigned.html','map_updated.html','map_v3_improved.html','map_v3_old.html',
    'map-v1.html','syntax-validator.html','test-excel-loader.html',
    'css/circular-timeline.css','css/dashboard-enhanced.css','css/dashboard-enhancement.css','css/dashboard-style.css',
    'css/map-style.css','css/story-map.css','css/style.css',
    'js/carbon-stock-dashboard.js','js/dashboard-statistics.js','js/dashboard-visualizations.js',
    'js/excel-dashboard.js','js/excel-data-loader.js','js/filter-ui-system.js','js/forest-rate-cards.js',
    'js/map-layer-control-advanced.js','js/map-old.js','js/map-v2.js','js/map-v2-backup.js','js/mangrove-layer-manager.js',
    'js/panel-renderer.js','js/zone-statistics-dashboard.js','js/zona-kawasan-manager.js','js/story-map.js',
    'data/NewData','data/OldData','data/storymaps.json','data/~$Dashboard.xlsx',
    'images/WEBIMG/Dokumentasi','images/WEBIMG/StoryMaps','images/laptop.png','images/mangrove2.JPG',
    'images/screen-demo.png','images/wallpaper.JPG','images/WEBIMG/Data.xlsx','images/WEBIMG/Hiliriset/~$Hiliriset.xlsx'
]

def delete_path(p):
    if not p.exists():
        print(f'MISSING: {p}')
        return
    try:
        if p.is_dir():
            shutil.rmtree(p)
            print(f'REMOVED DIR: {p}')
        else:
            p.unlink()
            print(f'REMOVED FILE: {p}')
    except Exception as e:
        print(f'ERROR {p}: {e}')

for rel in paths:
    target = base / rel
    delete_path(target)
