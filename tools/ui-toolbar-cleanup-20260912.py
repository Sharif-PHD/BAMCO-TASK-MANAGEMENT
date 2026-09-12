from pathlib import Path
import re


def edit(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    n = s.count(old)
    if n != 1:
        raise RuntimeError(f'{label}: expected 1 exact match, got {n}')
    p.write_text(s.replace(old, new, 1))


def regex_edit(path, pattern, replacement, label, flags=0):
    p = Path(path)
    s = p.read_text()
    out, n = re.subn(pattern, replacement, s, count=1, flags=flags)
    if n != 1:
        raise RuntimeError(f'{label}: expected 1 regex match, got {n}')
    p.write_text(out)


# Dashboard: remove obsolete Apply UI + dead listener. Date dialog already calls render() on set/clear.
edit('index.html', '<button id="applyPerf" type="button" class="primary">اعمال</button>', '', 'dashboard Apply button')
edit('assets/js/app.js', "$id('applyPerf')?.addEventListener('click',render);", '', 'dashboard Apply listener')

# Cache-bust every modified runtime asset.
for old, new in {
    'assets/js/app.js?v=task-row-deselect-root-20260912-3': 'assets/js/app.js?v=ui-toolbar-cleanup-20260912-1',
    'assets/js/phase2-message-engine.js?v=message-unified-20260911-1': 'assets/js/phase2-message-engine.js?v=ui-toolbar-cleanup-20260912-1',
    'assets/js/phase3-response-tracking.js?v=details-20260910-1': 'assets/js/phase3-response-tracking.js?v=ui-toolbar-cleanup-20260912-1',
    'assets/js/tab-workspace.js?v=catalog-20260910-1': 'assets/js/tab-workspace.js?v=ui-toolbar-cleanup-20260912-1',
    'assets/js/admin-root-fixes-20260911.js?v=user-fixes-20260911-1': 'assets/js/admin-root-fixes-20260911.js?v=ui-toolbar-cleanup-20260912-1',
    'assets/js/report-stability-fixes-20260911.js?v=performance-toolbar-root-20260912-2': 'assets/js/report-stability-fixes-20260911.js?v=ui-toolbar-cleanup-20260912-1',
}.items():
    edit('index.html', old, new, 'cache ' + old)

# Response report: remove search from canonical renderer and make first-row buttons regular weight.
p = 'assets/js/report-stability-fixes-20260911.js'
edit(p,
     '#responseReportView .response-command-row>*{flex:0 0 auto!important}',
     '#responseReportView .response-command-row>*{flex:0 0 auto!important}\n #responseReportView .response-command-row button{font-weight:400!important}',
     'response report regular buttons')
edit(p,
     "function responseVisible(){const term=(q('#canonicalResponseSearch')?.value||'').trim().toLocaleLowerCase(),from=inputIso(q('#canonicalResponseFrom')),to=inputIso(q('#canonicalResponseTo'));return responseRows.filter(x=>x.delivery_status!=='cancelled'&&(!from||String(x.sent_at||'').slice(0,10)>=from)&&(!to||String(x.sent_at||'').slice(0,10)<=to)&&(!term||[x.recipient_name,x.recipient_email,x.subject,x.reply_text].some(v=>String(v||'').toLocaleLowerCase().includes(term))))}",
     "function responseVisible(){const from=inputIso(q('#canonicalResponseFrom')),to=inputIso(q('#canonicalResponseTo'));return responseRows.filter(x=>x.delivery_status!=='cancelled'&&(!from||String(x.sent_at||'').slice(0,10)>=from)&&(!to||String(x.sent_at||'').slice(0,10)<=to))}",
     'response report search logic')
edit(p,
     '</div><div class="response-search-row"><input id="canonicalResponseSearch" type="search" placeholder="جست‌وجو در گزارش…" aria-label="جست‌وجو در گزارش پاسخ‌ها"></div>`}',
     '</div>`}',
     'response report search row')
edit(p,
     ";q('#canonicalResponseSearch')?.addEventListener('input',()=>{window.bamcoSelection?.clear?.('#responseReportBody');renderResponseRows()});window.bamcoInteriorUI?.decorateView?.(view)",
     ';window.bamcoInteriorUI?.decorateView?.(view)',
     'response report search listener')

# Legacy report renderer must not recreate the response-report search during view settlement.
p = 'assets/js/tab-workspace.js'
edit(p,
     '<div class="workspace-report-tools"><input type="search" data-report-search placeholder="جست‌وجو در گزارش…" aria-label="جست‌وجو در گزارش"><button data-report-export="all" class="ghost">خروجی اکسل</button></div>',
     '<div class="workspace-report-tools">${id===\'responseReport\'?\'\':\'<input type="search" data-report-search placeholder="جست‌وجو در گزارش…" aria-label="جست‌وجو در گزارش">\'}<button data-report-export="all" class="ghost">خروجی اکسل</button></div>',
     'legacy response report search')

# Message center: one bounded command row, no search, channel immediately after Refresh.
p = 'assets/js/phase2-message-engine.js'
regex_edit(p, r'function visible\(\)\{.*?\}\nfunction syncSelection', 'function visible(){return rows}\nfunction syncSelection', 'message center search logic', re.S)
edit(p,
     '#messageCenterView .message-command-row #sendSelectedMessages{',
     '#messageCenterView .message-command-row button{font-weight:400!important}#messageCenterView .message-command-row #sendSelectedMessages{',
     'message center regular buttons')
edit(p,
     '#messageCenterView .message-center-simple-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
     '',
     'message center obsolete toolbar css')
edit(p,
     '<div class="message-command-row"><button type="button" class="ghost" id="messageCenterHome">بازگشت به خانه</button><button type="button" class="ghost" id="messageCenterExport">خروجی اکسل</button><button type="button" class="ghost" id="refreshMessageCenter">تازه‌سازی</button><button id="sendSelectedMessages" type="button" class="primary" disabled>ارسال</button></div><div class="message-center-simple-toolbar"><label>کانال ارسال<select id="messageChannel"><option value="portal">داخل سامانه</option><option value="email">ایمیل</option><option value="both">هر دو</option></select></label><input id="messageCenterSearch" type="search" placeholder="جست‌وجوی نام یا ایمیل"><span id="messageSelectionCount">۰ نفر انتخاب شده</span></div>',
     '<div class="message-command-row"><button type="button" class="ghost" id="messageCenterHome">بازگشت به خانه</button><button type="button" class="ghost" id="messageCenterExport">خروجی اکسل</button><button type="button" class="ghost" id="refreshMessageCenter">تازه‌سازی</button><label class="message-channel-inline">کانال ارسال<select id="messageChannel"><option value="portal">داخل سامانه</option><option value="email">ایمیل</option><option value="both">هر دو</option></select></label><button id="sendSelectedMessages" type="button" class="primary" disabled>ارسال</button><span id="messageSelectionCount">۰ نفر انتخاب شده</span></div>',
     'message center command layout')
edit(p, "q('#messageCenterSearch').oninput=render;", '', 'message center search binding')
edit(p, 'متولی مطابق جست‌وجو وجود ندارد.', 'متولی برای نمایش وجود ندارد.', 'message center empty text')

# Sent messages: remove entire second controls row and keep only record count in the first row.
p = 'assets/js/admin-root-fixes-20260911.js'
marker = '#sentMessagesView .sent-command-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 0;margin:0 0 12px;border-top:1px solid #d9e4de;border-bottom:1px solid #d9e4de}'
edit(p, marker, marker + '\n#sentMessagesView .sent-command-row button{font-weight:400!important}', 'sent messages regular buttons')
regex_edit(p, r'function sentFiltered\(\)\{.*?\}\nfunction renderSent', "function sentFiltered(){return sentRows.filter(r=>r.delivery_status!=='cancelled')}\nfunction renderSent", 'sent messages filter logic', re.S)
regex_edit(p,
           r"function renderSent\(\)\{const view=ensureSentView\(\),filtered=sentFiltered\(\),search=q\('#sentSearch'\)\?\.value\|\|'',status=q\('#sentStatusFilter'\)\?\.value\|\|'',channel=q\('#sentChannelFilter'\)\?\.value\|\|'';view\.innerHTML=`",
           'function renderSent(){const view=ensureSentView(),filtered=sentFiltered();view.innerHTML=`',
           'sent messages renderer locals')
regex_edit(p,
           r'</div><div class="sent-controls">.*?</div><div class="table-wrap">',
           '<span class="sent-count">${faNum(filtered.length)} رکورد نمایش داده می‌شود</span></div><div class="table-wrap">',
           'sent messages second row',
           re.S)
edit(p,
     "function bindSentControls(){q('#sentSearch')?.addEventListener('input',renderSent);q('#sentStatusFilter')?.addEventListener('change',renderSent);q('#sentChannelFilter')?.addEventListener('change',renderSent);",
     'function bindSentControls(){',
     'sent messages removed control bindings')

# Response tracking: remove row-2 action button + row-3 quick buttons, keep select filters/channel.
p = 'assets/js/phase3-response-tracking.js'
edit(p,
     '#responseTrackingView .response-command-row>*{flex:0 0 auto}',
     '#responseTrackingView .response-command-row>*{flex:0 0 auto}\n    #responseTrackingView .response-command-row button{font-weight:400!important}',
     'response tracking regular buttons')
edit(p,
     '<div class="response-filters"><button id="responseSelectAll" type="button" class="ghost">انتخاب همه فیلترشده‌ها</button>',
     '<div class="response-filters">',
     'response tracking row-2 button')
regex_edit(p,
           r'</div><div class="response-quick"><button data-response-quick="all" class="active">همه</button>.*?</div><div class="table-wrap">',
           '</div><div class="table-wrap">',
           'response tracking row-3 buttons',
           re.S)
edit(p,
     "  qa('[data-response-quick]').forEach(b=>b.onclick=()=>{qa('[data-response-quick]').forEach(x=>x.classList.toggle('active',x===b));q('#responseState').value=b.dataset.responseQuick==='all'?'':b.dataset.responseQuick;selected.clear();if(['awaiting','reminder_needed'].includes(b.dataset.responseQuick))filtered().forEach(x=>selected.add(String(x.delivery_id)));render()});\n",
     '',
     'response tracking quick bindings')
edit(p,
     "  q('#responseSelectAll').onclick=()=>{const ids=filtered().map(x=>String(x.delivery_id)),clear=ids.length&&ids.every(id=>selected.has(id));ids.forEach(id=>clear?selected.delete(id):selected.add(id));render()};\n",
     '',
     'response tracking select-all binding')
edit(p,
     "\n  const all=q('#responseSelectAll');if(all)all.textContent=list.length&&list.every(x=>selected.has(String(x.delivery_id)))?'لغو انتخاب فیلترشده‌ها':'انتخاب همه فیلترشده‌ها';",
     '',
     'response tracking select-all render')

# Existing workflow regression expects the new inline channel position.
p = 'tests/workflow-tabs-root-20260912.test.cjs'
edit(p,
     "assert.deepEqual(texts.slice(0,4),['بازگشت به خانه','خروجی اکسل','تازه‌سازی','ارسال']);",
     "assert.deepEqual(texts.slice(0,3),['بازگشت به خانه','خروجی اکسل','تازه‌سازی']);assert.match(texts[3],/کانال ارسال/);assert.equal(texts[4],'ارسال');",
     'message-center regression expectation')

print('UI toolbar cleanup source patch completed.')
