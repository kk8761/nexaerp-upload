import os

path = 'C:/Users/karth/OneDrive/Desktop/NexaERP/dashboard.html'
with open(path, 'rb') as f:
    content = f.read()

start_tag = b'<!-- Store selector -->'
end_tag = b'</select>'

start_idx = content.find(start_tag)
if start_idx != -1:
    end_idx = content.find(end_tag, start_idx) + len(end_tag)
    r = b'''<!-- Branch Selector -->
        <div style="display:flex;align-items:center;padding:2px 8px;background:var(--color-bg-secondary);border:1px solid var(--color-border-subtle);border-radius:var(--radius-full)">
          <span style="font-size:12px;margin-right:8px;opacity:0.6">\xf0\x9f\x93\x8d</span>
          <select class="form-select" style="width:auto;border:none;background:transparent;padding:4px 24px 4px 4px;font-size:var(--text-xs);font-weight:600" id="store-selector" onchange="handleBranchChange()">
            <option value="all">Consolidated View</option>
            <option value="main">Main Branch</option>
            <option value="branch1">Warehouse A</option>
            <option value="branch2">Retail B</option>
          </select>
        </div>'''
    new_content = content[:start_idx] + r + content[end_idx:]
    with open(path, 'wb') as f:
        f.write(new_content)
    print("Success")
else:
    print("Not found")
