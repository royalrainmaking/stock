PAGES['backup'] = {
  render() {
    const html = `
      <div class="page-header">
        <h2>สำรองและกู้คืนข้อมูล</h2>
      </div>
      <div class="card" style="margin-bottom: 24px;">
        <h3 style="margin-bottom: 16px; color: var(--primary);"><span class="material-icons" style="vertical-align: middle; margin-right: 8px;">cloud_download</span> สำรองข้อมูล (Backup)</h3>
        <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">
          เมื่อกดปุ่มด้านล่าง ระบบจะทำการสำรองข้อมูลฐานข้อมูลทั้งหมดไปยัง Google Drive ของคุณโดยอัตโนมัติ
          <br> แนะนำให้สำรองข้อมูลเป็นประจำสัปดาห์ละ 1-2 ครั้ง หรือก่อนทำการเปลี่ยนแปลงข้อมูลจำนวนมาก
        </p>
        <button class="btn btn-primary" onclick="doBackupDatabase()">
          <span class="material-icons">backup</span> เริ่มสำรองข้อมูลเดี๋ยวนี้
        </button>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 16px; color: var(--warning);"><span class="material-icons" style="vertical-align: middle; margin-right: 8px;">settings_backup_restore</span> การกู้คืนข้อมูล (Restore)</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
          <strong>คำเตือน:</strong> การกู้คืนข้อมูลจะทำการ <span style="color:var(--danger)">เขียนทับ (Overwrite)</span> ข้อมูลปัจจุบันในระบบทั้งหมดด้วยข้อมูลจากไฟล์ Backup ที่คุณเลือก โปรดตรวจสอบให้แน่ใจก่อนทำการกู้คืน
        </p>
        
        <button class="btn btn-outline" onclick="loadBackupList()" style="margin-bottom: 16px;">
          <span class="material-icons">refresh</span> โหลดรายชื่อไฟล์สำรองข้อมูลล่าสุด
        </button>
        
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>วันที่สำรองข้อมูล</th>
                <th>ชื่อไฟล์</th>
                <th style="width: 150px; text-align: center;">จัดการ</th>
              </tr>
            </thead>
            <tbody id="backup-list-body">
              <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 24px;">กดปุ่มด้านบนเพื่อโหลดรายชื่อไฟล์สำรองข้อมูล</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.getElementById('page-backup').innerHTML = html;
  }
};

window.loadBackupList = async function() {
  const tbody = document.getElementById('backup-list-body');
  tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 24px;">กำลังโหลด... <span class="material-icons rotating" style="vertical-align: middle; font-size: 18px;">sync</span></td></tr>`;
  
  try {
    const res = await API.getBackupList();
    if (!res.backups || res.backups.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 24px;">ไม่พบไฟล์สำรองข้อมูล</td></tr>`;
      return;
    }
    
    tbody.innerHTML = res.backups.map(b => `
      <tr>
        <td>${b.dateStr}</td>
        <td>
          <a href="${b.url}" target="_blank" style="color: var(--primary); text-decoration: none;">
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">open_in_new</span> ${b.name}
          </a>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-danger btn-sm" onclick="confirmRestore('${b.id}', '${b.name}')">
            กู้คืนข้อมูล
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--danger); padding: 24px;">โหลดข้อมูลล้มเหลว: ${err.message}</td></tr>`;
  }
};

window.confirmRestore = async function(fileId, fileName) {
  const c1 = await UI.confirm('คำเตือน: กู้คืนข้อมูล', `คุณแน่ใจหรือไม่ที่จะกู้คืนข้อมูลจากไฟล์\n"${fileName}"?\n\nข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่ด้วยข้อมูลจากไฟล์นี้!`, 'ฉันแน่ใจ ต้องการกู้คืน', 'ยกเลิก');
  if (!c1) return;
  
  const c2 = await UI.confirm('ยืนยันครั้งสุดท้าย', 'การกระทำนี้ไม่สามารถย้อนกลับได้ กรุณายืนยันอีกครั้งว่าต้องการกู้คืนข้อมูล?', 'ยืนยันกู้คืน (Overwrite)', 'ยกเลิก');
  if (!c2) return;
  
  UI.loading(true);
  try {
    const res = await API.restoreDatabase(fileId);
    UI.toast(res.message || 'กู้คืนข้อมูลสำเร็จ!', 'success');
    
    // โหลดหน้าเว็บใหม่ทั้งหมดเพื่ออัปเดตข้อมูลในเครื่อง
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err) {
    UI.toast(err.message || 'ไม่สามารถกู้คืนข้อมูลได้', 'error');
  } finally {
    UI.loading(false);
  }
};
