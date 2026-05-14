// ============================================================
// pages/change-password.js
// ============================================================

PAGES['change-password'] = {
  render() {
    const el = document.getElementById('page-change-password');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-wrap">
          <div class="page-title-icon" style="background:linear-gradient(135deg,#37474F,#263238)">
            <span class="material-icons">lock_reset</span>
          </div>
          <div>
            <h2 class="page-title">เปลี่ยนรหัสผ่าน</h2>
            <p class="page-subtitle">อัปเดตรหัสผ่านของคุณเพื่อความปลอดภัย</p>
          </div>
        </div>
      </div>
      <div style="max-width:480px">
        <div class="card">
          <div class="form-group">
            <label>รหัสผ่านเดิม *</label>
            <div class="password-wrap">
              <input type="password" id="cp-old" placeholder="รหัสผ่านเดิม" />
              <button type="button" class="pwd-toggle" onclick="togglePassword('cp-old',this)"><span class="material-icons">visibility</span></button>
            </div>
          </div>
          <div class="form-group">
            <label>รหัสผ่านใหม่ *</label>
            <div class="password-wrap">
              <input type="password" id="cp-new" placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" />
              <button type="button" class="pwd-toggle" onclick="togglePassword('cp-new',this)"><span class="material-icons">visibility</span></button>
            </div>
          </div>
          <div class="form-group">
            <label>ยืนยันรหัสผ่านใหม่ *</label>
            <div class="password-wrap">
              <input type="password" id="cp-confirm" placeholder="ยืนยันรหัสผ่านใหม่" />
              <button type="button" class="pwd-toggle" onclick="togglePassword('cp-confirm',this)"><span class="material-icons">visibility</span></button>
            </div>
          </div>
          <div id="cp-error" class="error-msg hidden"></div>
          <button class="btn btn-primary btn-full mt-8" onclick="PAGES['change-password'].submit()">
            <span class="material-icons">lock</span> เปลี่ยนรหัสผ่าน
          </button>
        </div>
      </div>
    `;
  },

  async submit() {
    const oldPw = document.getElementById('cp-old')?.value;
    const newPw = document.getElementById('cp-new')?.value;
    const confirm = document.getElementById('cp-confirm')?.value;
    const errEl = document.getElementById('cp-error');

    errEl.classList.add('hidden');
    if (!oldPw || !newPw || !confirm) {
      errEl.textContent = 'กรุณากรอกข้อมูลให้ครบ';
      errEl.classList.remove('hidden'); return;
    }
    if (newPw.length < 6) {
      errEl.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
      errEl.classList.remove('hidden'); return;
    }
    if (newPw !== confirm) {
      errEl.textContent = 'รหัสผ่านใหม่และยืนยันไม่ตรงกัน';
      errEl.classList.remove('hidden'); return;
    }
    try {
      UI.loading(true);
      await API.changePassword(oldPw, newPw);
      UI.toast('เปลี่ยนรหัสผ่านเรียบร้อย ✅', 'success');
      document.getElementById('cp-old').value = '';
      document.getElementById('cp-new').value = '';
      document.getElementById('cp-confirm').value = '';
    } catch(e) {
      errEl.textContent = e.message || 'เกิดข้อผิดพลาด';
      errEl.classList.remove('hidden');
    } finally { UI.loading(false); }
  }
};
