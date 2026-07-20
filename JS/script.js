const G_URL = "https://script.google.com/macros/s/AKfycbzwW5Taa_YOZ1DF_mJGQ4-UStSUCg8WYzldkC_v1nwianvF3oUdsA0n9x04jDI4DdrB0A/exec";
const DEVICE_URL = "https://script.google.com/macros/s/AKfycbzgX1RvgaxsBZn-GIfr1EaPSBxAZqn1mvE0MZGovnAN1UW0rV_tk4HV-BN34FkF6xfV/exec";

const LOGIN_VERSION = "2026.06.03"; 

let allData = [];      
let db_accounts = {};  
let ALL_DEVICES = [];  

window.onload = function() {
    const cachedAcc = localStorage.getItem("cached_accounts");
    if (cachedAcc) {
        try {
            db_accounts = JSON.parse(cachedAcc);
            renderUserSelect();
        } catch(e) {
            db_accounts = {};
        }
    }

    const savedVersion = localStorage.getItem("loginVersion");
    if (savedVersion !== LOGIN_VERSION) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("reportUser");
    }

    if (localStorage.getItem("isLoggedIn") === "true") {
        const loginOverlay = document.getElementById("loginOverlay");
        if (loginOverlay) loginOverlay.style.display = "none";
    }

    const today = new Date().toISOString().split('T')[0]; 
    ['ngay', 'filterDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    loadData();        
    loadDeviceList(); 
};

function renderUserSelect() {
    const select = document.getElementById("userNameInput");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>-- Chọn tên của bạn --</option>';
    
    Object.keys(db_accounts).forEach(user => {
        if (user && user.trim() !== "") {
            let opt = document.createElement("option");
            opt.value = user;
            opt.textContent = user;
            select.appendChild(opt);
        }
    });
}

function checkLogin() {
    const user = document.getElementById("userNameInput").value;
    const pin = document.getElementById("accessCode").value;
    const errorMsg = document.getElementById("loginError");

    if (!user) {
        if (errorMsg) {
            errorMsg.innerText = "Vui lòng chọn tên!";
            errorMsg.style.display = "block";
        }
        return;
    }

    if (db_accounts[user] && db_accounts[user].toString().trim() === pin.trim()) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("reportUser", user);
        localStorage.setItem("loginVersion", LOGIN_VERSION);
        const loginOverlay = document.getElementById("loginOverlay");
        if (loginOverlay) loginOverlay.style.display = "none";
        if (errorMsg) errorMsg.style.display = "none";
    } else {
        if (errorMsg) {
            errorMsg.innerText = "Mã PIN không đúng hoặc dữ liệu chưa tải xong!";
            errorMsg.style.display = "block";
        }
    }
}

async function changePassword() {
    const user = localStorage.getItem("reportUser");
    if (!user) return alert("Vui lòng đăng nhập!");

    const newPass = prompt(`Nhập mã PIN mới cho [${user}]:`);
    if (!newPass || newPass.trim() === "") return;
    if (newPass.trim().length < 4) return alert("Mã PIN tối thiểu 4 ký tự!");

    if (!confirm(`Xác nhận đổi mã PIN thành: ${newPass}?`)) return;

    const payload = {
        action: "changePassword",
        username: user,
        newPass: newPass.trim()
    };

    try {
        await fetch(G_URL, { 
            method: "POST", 
            mode: "no-cors", 
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });
        alert("✅ Đã gửi yêu cầu đổi mã PIN! Hệ thống sẽ cập nhật sau vài giây.");
        
        db_accounts[user] = newPass.trim();
        localStorage.setItem("cached_accounts", JSON.stringify(db_accounts));
    } catch (e) {
        alert("❌ Lỗi: " + e.message);
    }
}

async function loadData() {
    const reportArea = document.getElementById('reportText');
    const listArea = document.getElementById('reportList');
    
    if (reportArea) reportArea.value = "⏳ Đang đồng bộ và làm mới dữ liệu...";
    if (listArea) listArea.innerHTML = "<div style='color:#6c757d; padding:8px;'>⏳ Đang đồng bộ...</div>";

    try {
        const res = await fetch(`${G_URL}?_cc=${new Date().getTime()}`);
        const json = await res.json();
        
        allData = json.reports || [];
        db_accounts = json.accounts || {};

        localStorage.setItem("cached_accounts", JSON.stringify(db_accounts));
        renderUserSelect();
        filterData();
        console.log("✅ Dữ liệu mới nhất đã đồng bộ thành công!");
    } catch (e) {
        if (reportArea) reportArea.value = "⚠️ Lỗi làm mới dữ liệu. Vui lòng thử lại.";
        if (listArea) listArea.innerHTML = "<div style='color:#dc3545; padding:8px;'>⚠️ Lỗi kết nối Google Sheets.</div>";
        console.error("Lỗi khi click làm mới:", e);
    }
}

async function loadDeviceList() {
    try {
        const res = await fetch(DEVICE_URL);
        const json = await res.json();
        ALL_DEVICES = json.devices || json.data || json || [];
        console.log("Đã tải danh mục máy:", ALL_DEVICES);
    } catch (e) {
        console.error("Không thể nạp danh mục máy:", e.message);
    }
}

function autoFillDeviceName(maSo) {
    const txtTenMay = document.getElementById('noidung2');
    if (!txtTenMay) return;

    const maTimKiem = maSo.trim().toUpperCase();

    if (maTimKiem === "" || maTimKiem === "KLM-CK-") {
        txtTenMay.value = "";
        return;
    }

    const thietBiTimThay = ALL_DEVICES.find(item => {
        if (Array.isArray(item)) {
            return (item[1] || "").toString().trim().toUpperCase() === maTimKiem;
        } else if (item && typeof item === 'object') {
            const maTrongHeThong = (item.mamay || item.macode || item.code || item.maThietBi || "").toString().trim().toUpperCase();
            return maTrongHeThong === maTimKiem;
        }
        return false;
    });

    if (thietBiTimThay) {
        if (Array.isArray(thietBiTimThay)) {
            txtTenMay.value = thietBiTimThay[2] || "";
        } else {
            txtTenMay.value = thietBiTimThay.tenmay || thietBiTimThay.tenthietbi || thietBiTimThay.noidung || "";
        }
    } else {
        txtTenMay.value = ""; 
    }
}

async function sendWorkReport() {
    const btn = document.getElementById('btnSubmit');
    const text = document.getElementById('btnText');
    const loader = document.getElementById('loadingSpinner');
    
    const noidung1 = document.getElementById('noidung1').value;
    const noidung2 = document.getElementById('noidung2').value.trim().toUpperCase();
    let noidung3 = document.getElementById('noidung3').value.trim();
    if (noidung3.length > 0) {
        noidung3 = noidung3.charAt(0).toLowerCase() + noidung3.slice(1);
    } 
    const noidung4 = document.getElementById('noidung4').value.trim();
    
    const nhansu = document.getElementById('nhansu').value.trim();
    const reporter = localStorage.getItem("reportUser") || "Ẩn danh";
    const ngayReport = document.getElementById('ngay').value;
    const tienDo = document.getElementById('ghichu').value;
    const trangthai = document.getElementById('trangthai').value;

    if (!noidung2 || !nhansu) return alert("⚠️ Vui lòng nhập đầy đủ tên máy và nhân sự!");

    const noidungHoanChinh = `${noidung1} ${noidung2} ${noidung3} ${noidung4}`.trim();

    const payload = {
        action: "create",
        jobContent: noidungHoanChinh,
        status: trangthai,
        worker: nhansu,
        note: tienDo,
        reporter: reporter,
        date: ngayReport
    };

    if (btn) btn.disabled = true;
    if (text) text.innerText = "ĐANG GỬI...";
    if (loader) loader.style.display = "inline-block";

    try {
        await fetch(G_URL, { 
            method: "POST", 
            mode: "no-cors", 
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });
        
        alert("✅ Gửi thành công!");
        document.getElementById('noidung2').value = "";
        document.getElementById('noidung3').value = "KLM-CK-";
        document.getElementById('noidung4').value = "";
        loadData();
    } catch (err) {
        alert("❌ Lỗi gửi: " + err.message);
    } finally {
        if (btn) btn.disabled = false;
        if (text) text.innerText = "GỬI BÁO CÁO";
        if (loader) loader.style.display = "none";
    }
}

function filterData() {
    const filterInput = document.getElementById('filterDate');
    const reportArea = document.getElementById('reportText');
    const listArea = document.getElementById('reportList');
    
    if (!filterInput) return;
    const filterVal = filterInput.value;
    if (!filterVal) return;

    const filtered = allData.filter(item => item.ngay && item.ngay.substring(0, 10) === filterVal);
    const d = filterVal.split('-');
    
    if (reportArea) {
        let content = `Báo cáo công việc ngày ${d[2]}/${d[1]}/${d[0]}\n----------------------------------\n`;
        if (filtered.length === 0) {
            content += "(Chưa có dữ liệu)";
        } else {
            filtered.forEach(item => {
                let gc = (item.ghichu && item.ghichu !== "") ? ` ${item.ghichu}%` : "";
                content += `- ${item.noidung} (${item.nhansu || item.worker || ''})${gc}\n`;
            });
        }
        reportArea.value = content;
    }

    if (listArea) {
        listArea.innerHTML = "";
        if (filtered.length === 0) {
            listArea.innerHTML = "<div style='color:#6c757d; padding:8px;'>(Chưa có dữ liệu ngày này)</div>";
            return;
        }
        
        filtered.forEach(item => {
            const rowId = item.id || item.rowNum; 
            const div = document.createElement('div');
            div.className = "list-group-item d-flex justify-content-between align-items-center gap-2 p-2";
            div.style.borderBottom = "1px solid #dee2e6";
            
            let gc = (item.ghichu && item.ghichu !== "") ? ` ${item.ghichu}%` : "";
            const textHienThi = `- ${item.noidung} (${item.nhansu || item.worker || ''})${gc}`;
            
            div.innerHTML = `
                <span class="report-item-text" style="font-size:14px; word-break: break-word;">${textHienThi}</span>
                <div class="d-flex gap-1" style="flex-shrink: 0;">
                    <button class="btn-sm btn-outline-warning" onclick="editReport('${rowId}', '${item.noidung}')">✏️</button>
                    <button class="btn-sm btn-outline-danger" onclick="deleteReport('${rowId}')">❌</button>
                </div>
            `;
            listArea.appendChild(div);
        });
    }
}

async function editReport(id, oldContent) {
    if (!id || id === "undefined") return alert("❌ Không tìm thấy ID dòng để sửa. Hãy bấm làm mới!");
    
    const newContent = prompt("Chỉnh sửa nội dung báo cáo:", oldContent);
    if (newContent === null) return; 
    if (newContent.trim() === "") return alert("❌ Nội dung công việc không được để trống!");

    const currentItem = allData.find(item => (item.id || item.rowNum).toString() === id.toString());
    const oldWorker = currentItem ? (currentItem.nhansu || currentItem.worker || "") : "";

    const newWorker = prompt("Chỉnh sửa nhân sự thực hiện:", oldWorker);
    if (newWorker === null) return; 
    if (newWorker.trim() === "") return alert("❌ Tên nhân sự không được để trống!");

    const payload = { 
        action: "update", 
        id: id, 
        jobContent: newContent.trim(),
        worker: newWorker.trim() 
    };
    
    try {
        await fetch(G_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
        alert("✅ Đã gửi yêu cầu sửa nội dung và nhân sự!");
        loadData(); 
    } catch (e) {
        alert("❌ Lỗi sửa: " + e.message);
    }
}

async function deleteReport(id) {
    if (!id || id === "undefined") return alert("❌ Không tìm thấy ID dòng để xóa. Hãy bấm làm mới!");
    if (!confirm("⚠️ Bạn có chắc chắn muốn XÓA dòng báo cáo này không?")) return;

    const payload = { action: "delete", id: id };

    try {
        await fetch(G_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
        alert("✅ Đã gửi yêu cầu xóa!");
        loadData();
    } catch (e) {
        alert("❌ Lỗi xóa: " + e.message);
    }
}

function copyReport() {
    const copyText = document.getElementById("reportText");
    if (!copyText || !copyText.value || copyText.value.includes("Đang đồng bộ")) return;

    copyText.select();
    navigator.clipboard.writeText(copyText.value).then(() => {
        const btn = document.querySelector('button[onclick="copyReport()"]');
        if (btn) {
            const oldText = btn.innerHTML;
            btn.innerHTML = "✅ Đã chép";
            setTimeout(() => btn.innerHTML = oldText, 2000);
        }
    });
}

function syncInput(val) {
    const gc = document.getElementById('ghichu');
    if (gc) gc.value = val;
    updateStatusByProgress(val);
}

function syncRange(val) {
    let v = Math.min(100, Math.max(0, parseInt(val) || 0));
    const pr = document.getElementById('progressRange');
    if (pr) pr.value = v;
    updateStatusByProgress(v);
}

function updateStatusByProgress(progressValue) {
    const txtTrangThai = document.getElementById('trangthai');
    if (!txtTrangThai) return;

    let p = parseInt(progressValue) || 0;
    if (p === 100) {
        txtTrangThai.value = "Hoàn thành"; 
    } else {
        txtTrangThai.value = "Đang thực hiện"; 
    }
}

function toggleMenu() {
    var menu = document.getElementById("sideMenu");
    if (menu) menu.classList.toggle("open"); 
}

function toggleReportList() {
    const wrapper = document.getElementById('reportListWrapper');
    const btn = document.getElementById('btnToggleList');
    
    if (!wrapper || !btn) return;
    
    if (wrapper.style.display === "none") {
        wrapper.style.display = "block";
        btn.innerText = "🔼 Ẩn";
        btn.style.backgroundColor = "#transparent";
        btn.style.color = "#fff";
		btn.style.marginBottom = "0px";
    } else {
        wrapper.style.display = "none";
        btn.innerText = "🔽 Hiện";
        btn.style.backgroundColor = "transparent";
        btn.style.color = "#fff";
		btn.style.marginBottom = "0px";
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('reportUser');
    window.location.reload();
}