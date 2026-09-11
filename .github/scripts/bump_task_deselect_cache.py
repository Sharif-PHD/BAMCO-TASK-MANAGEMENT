from pathlib import Path
p=Path('index.html')
s=p.read_text()
old='assets/js/app.js?v=task-filter-repair-20260912-2'
new='assets/js/app.js?v=task-row-deselect-root-20260912-3'
assert old in s, 'current app cache key not found'
s=s.replace(old,new,1)
s=s.replace('assets/js/avatar-final-20260911.js?v=task-row-deselect-root-20260912-2','assets/js/avatar-final-20260911.js?v=task-row-deselect-root-20260912-3',1)
p.write_text(s)
