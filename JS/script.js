const G_URL = "https://script.google.com/macros/s/AKfycbzwW5Taa_YOZ1DF_mJGQ4-UStSUCg8WYzldkC_v1nwianvF3oUdsA0n9x04jDI4DdrB0A/exec";
const LOGIN_VERSION = "2026.05.05"; 

let allData = [];
let db_accounts = {}; 

window.onload = function() {
    // 1. Khôi phục danh sách tài khoản từ cache để hiển thị ngay khi mở trang
    const cachedAcc = localStorage.getItem("cached_accounts");
    if (cachedAcc) {
        db_accounts = JSON.parse(cachedAcc);
        renderUserSelect();
    }

    // 2. Kiểm tra phiên bản đăng nhập
    const savedVersion = localStorage.getItem("loginVersion");
    if (savedVersion !== LOGIN_VERSION) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("reportUser");
    }

    if (localStorage.getItem("isLoggedIn") === "true") {
        const loginOverlay = document.getElementById("loginOverlay");
        if (loginOverlay) loginOverlay.style.display = "none";
    }

    // 3. Thiết lập ngày mặc định (YYYY-MM-DD)
    const today = new Date().toLocaleDateString('sv-SE'); 
    ['ngay', 'filterDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    // 4. Tải dữ liệu từ server
    loadData();
};

/** --- HỆ THỐNG TÀI KHOẢN --- **/

function renderUserSelect() {
    const select = document.getElementById("userNameInput");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>-- Chọn tên của bạn --</option>';
    
    Object.keys(db_accounts).forEach(user => {
        let opt = document.createElement("option");
        opt.value = user;
        opt.textContent = user;
        select.appendChild(opt);
    });
}

function checkLogin() {
    const user = document.getElementById("userNameInput").value;
    const pin = document.getElementById("accessCode").value;
    const errorMsg = document.getElementById("loginError");

    if (!user) {
        errorMsg.innerText = "Vui lòng chọn tên!";
        errorMsg.style.display = "block";
        return;
    }

    if (db_accounts[user] && db_accounts[user].toString() === pin) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("reportUser", user);
        localStorage.setItem("loginVersion", LOGIN_VERSION);
        document.getElementById("loginOverlay").style.display = "none";
    } else {
        errorMsg.innerText = "Mã PIN không đúng!";
        errorMsg.style.display = "block";
    }
}

async function changePassword() {
    const user = localStorage.getItem("reportUser");
    if (!user) return alert("Vui lòng đăng nhập!");

    const newPass = prompt(`Nhập mã PIN mới cho [${user}]:`);
    if (!newPass || newPass.trim() === "") return;
    if (newPass.length < 4) return alert("Mã PIN tối thiểu 4 ký tự!");

    if (!confirm(`Xác nhận đổi mã PIN thành: ${newPass}?`)) return;

    // SỬ DỤNG URLSearchParams để GS nhận diện qua e.parameter
    const formData = new URLSearchParams();
    formData.append('action', 'changePassword');
    formData.append('username', user);
    formData.append('newPass', newPass.trim());

    try {
        fetch(G_URL, { 
            method: "POST", 
            mode: "no-cors", 
            body: formData.toString(),
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        alert("✅ Đã gửi yêu cầu đổi mã PIN! Hệ thống sẽ cập nhật sau vài giây.");
        
        db_accounts[user] = newPass.trim();
        localStorage.setItem("cached_accounts", JSON.stringify(db_accounts));
    } catch (e) {
        alert("❌ Lỗi: " + e.message);
    }
}

/** --- XỬ LÝ BÁO CÁO --- **/

async function loadData() {
    const reportArea = document.getElementById('reportText');
    if (reportArea && allData.length === 0) reportArea.value = "⏳ Đang đồng bộ dữ liệu...";

    try {
        const res = await fetch(G_URL);
        const json = await res.json();
        
        allData = json.reports || [];
        db_accounts = json.accounts || {};

        localStorage.setItem("cached_accounts", JSON.stringify(db_accounts));
        renderUserSelect();
        filterData();
    } catch (e) {
        if (reportArea) reportArea.value = "⚠️ Lỗi tải dữ liệu. Vui lòng kiểm tra mạng.";
    }
}

function sendWorkReport() {
    const btn = document.getElementById('btnSubmit');
    const text = document.getElementById('btnText');
    const loader = document.getElementById('loadingSpinner');
    
    const noidung = document.getElementById('noidung').value.trim();
    const nhansu = document.getElementById('nhansu').value.trim();
    const reporter = localStorage.getItem("reportUser") || "Ẩn danh";
    const ngayReport = document.getElementById('ngay').value;
    const tienDo = document.getElementById('ghichu').value;

    if(!noidung || !nhansu) return alert("⚠️ Vui lòng nhập Nội dung và Nhân sự!");

    // SỬ DỤNG URLSearchParams ĐỂ GS KHÔNG GHI NHẦM SHEET
    const formData = new URLSearchParams();
    formData.append('jobContent', noidung);
    formData.append('worker', nhansu);
    formData.append('status', document.getElementById('trangthai').value);
    formData.append('note', tienDo);
    formData.append('customDate', ngayReport);
    formData.append('reporter', reporter);

    btn.disabled = true;
    text.innerText = "ĐANG GỬI...";
    if (loader) loader.style.display = "inline-block";

    fetch(G_URL, { 
        method: "POST", 
        mode: "no-cors", 
        body: formData.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    .then(() => {
        alert("✅ Gửi thành công!");
        allData.unshift({ ngay: ngayReport, noidung: noidung, nhansu: nhansu, ghichu: tienDo });
        document.getElementById('noidung').value = "";
        filterData();
    })
    .catch(err => alert("❌ Lỗi gửi: " + err))
    .finally(() => {
        btn.disabled = false;
        text.innerText = "GỬI BÁO CÁO";
        if (loader) loader.style.display = "none";
    });
}

function filterData() {
    const filterVal = document.getElementById('filterDate').value;
    const reportArea = document.getElementById('reportText');
    if (!filterVal || !reportArea) return;

    const filtered = allData.filter(item => item.ngay && item.ngay.substring(0, 10) === filterVal);
    const d = filterVal.split('-');
    let content = `Báo cáo công việc ngày ${d[2]}/${d[1]}/${d[0]}\n----------------------------------\n`;

    if (filtered.length === 0) {
        content += "(Chưa có dữ liệu)";
    } else {
        filtered.forEach(item => {
            let gc = (item.ghichu && item.ghichu !== "") ? ` ${item.ghichu}%` : "";
            content += `- ${item.noidung} (${item.nhansu})${gc}\n`;
        });
    }
    reportArea.value = content;
}

/** --- UI HELPERS --- **/

function copyReport() {
    const copyText = document.getElementById("reportText");
    if (!copyText || !copyText.value || copyText.value.includes("Đang tải")) return;

    copyText.select();
    navigator.clipboard.writeText(copyText.value).then(() => {
        const btn = document.querySelector('button[onclick="copyReport()"]');
        const oldText = btn.innerHTML;
        btn.innerHTML = "✅ Đã chép";
        setTimeout(() => btn.innerHTML = oldText, 2000);
    });
}

function syncRange(val) {
    let v = Math.min(100, Math.max(0, parseInt(val) || 0));
    document.getElementById('progressRange').value = v;
}

function syncInput(val) {
    document.getElementById('ghichu').value = val;
}

function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    if (menu) menu.style.width = (menu.style.width === "270px") ? "0" : "270px";
}
