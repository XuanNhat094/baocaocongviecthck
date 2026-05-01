const G_URL = "https://script.google.com/macros/s/AKfycbzwW5Taa_YOZ1DF_mJGQ4-UStSUCg8WYzldkC_v1nwianvF3oUdsA0n9x04jDI4DdrB0A/exec";

// --- CẤU HÌNH HỆ THỐNG ---
const MY_SECRET_CODE = "KLM2026"; 
const LOGIN_VERSION = "2026.05.01"; 
let allData = [];

window.onload = function() {
    // 1. QUẢN LÝ ĐĂNG NHẬP
    const savedVersion = localStorage.getItem("loginVersion");
    if (savedVersion !== LOGIN_VERSION) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("reportUser");
    }

    if (localStorage.getItem("isLoggedIn") === "true") {
        const loginOverlay = document.getElementById("loginOverlay");
        if (loginOverlay) loginOverlay.style.display = "none";
    }

    // 2. TỰ ĐỘNG CHỌN NGÀY HÔM NAY (Theo giờ địa phương Việt Nam)
    const now = new Date();
    const today = now.toLocaleDateString('sv-SE'); // Trả về dạng YYYY-MM-DD chuẩn xác

    const ngayInput = document.getElementById('ngay');
    const filterInput = document.getElementById('filterDate');

    if (ngayInput) ngayInput.value = today;
    if (filterInput) filterInput.value = today;

    // 3. TẢI DỮ LIỆU
    loadData();
};

function checkLogin() {
    const inputCode = document.getElementById("accessCode").value;
    const nameInput = document.getElementById("userNameInput").value.trim();
    const errorMsg = document.getElementById("loginError");

    if (inputCode === MY_SECRET_CODE && nameInput !== "") {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("reportUser", nameInput);
        localStorage.setItem("loginVersion", LOGIN_VERSION);
        document.getElementById("loginOverlay").style.display = "none";
    } else {
        errorMsg.innerText = nameInput === "" ? "Vui lòng nhập tên người báo cáo!" : "Mã PIN không đúng!";
        errorMsg.style.display = "block";
    }
}

// --- XỬ LÝ DỮ LIỆU ---
async function loadData() {
    const reportArea = document.getElementById('reportText');
    if (reportArea) reportArea.value = "⏳ Đang tải dữ liệu...";
    try {
        const res = await fetch(G_URL);
        allData = await res.json();
        filterData();
    } catch (e) {
        if (reportArea) reportArea.value = "❌ Không thể tải dữ liệu.";
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

    if(!noidung || !nhansu) {
        return alert("⚠️ Vui lòng nhập đầy đủ Nội dung và Nhân sự!");
    }

    const params = new URLSearchParams();
    params.append('jobContent', noidung);
    params.append('worker', nhansu);
    params.append('status', document.getElementById('trangthai').value);
    params.append('note', tienDo);
    params.append('customDate', ngayReport);
    params.append('reporter', reporter);

    // Hiệu ứng chờ
    btn.disabled = true;
    text.innerText = "ĐANG GỬI...";
    loader.style.display = "inline-block";

    fetch(G_URL, {
        method: "POST",
        mode: "no-cors",
        body: params.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    .then(() => {
        alert("✅ Đã gửi thành công!");
        
        // CẬP NHẬT NHANH: Thêm dữ liệu vào danh sách hiện tại mà không cần tải lại trang
        const newEntry = {
            ngay: ngayReport,
            noidung: noidung,
            nhansu: nhansu,
            ghichu: tienDo
        };
        allData.unshift(newEntry); // Đẩy lên đầu danh sách

        // Reset ô nhập
        document.getElementById('noidung').value = "";
        
        // Cập nhật lại vùng hiển thị báo cáo ngay lập tức
        filterData();
    })
    .catch(err => alert("❌ Lỗi: " + err))
    .finally(() => {
        btn.disabled = false;
        text.innerText = "GỬI BÁO CÁO";
        loader.style.display = "none";
    });
}

function filterData() {
    const filterVal = document.getElementById('filterDate').value;
    const reportArea = document.getElementById('reportText');
    
    if (!filterVal || !reportArea) return;

    const d = filterVal.split('-');
    const displayDate = `${d[2]}/${d[1]}/${d[0]}`;

    // TỐI ƯU: Lọc bằng chuỗi (substring) nhanh hơn dùng đối tượng Date
    const filtered = allData.filter(item => {
        if(!item.ngay) return false;
        return item.ngay.substring(0, 10) === filterVal;
    });

    let content = `Báo cáo công việc ngày ${displayDate}\n`;
    content += `----------------------------------\n`;

    if (filtered.length === 0) {
        content += "(Chưa có dữ liệu báo cáo cho ngày này)";
    } else {
        filtered.forEach(item => {
            const nd = item.noidung || "";
            const ns = item.nhansu || "";
            let gc = item.ghichu || "";
            if (gc !== "") gc = gc + "%";
            content += `- ${nd} (${ns})${gc}\n`;
        });
    }
    reportArea.value = content;
}

// --- TIỆN ÍCH ---
function copyReport() {
    const copyText = document.getElementById("reportText");
    if (!copyText.value || copyText.value.includes("Đang tải")) return;

    copyText.select();
    navigator.clipboard.writeText(copyText.value).then(() => {
        const btn = document.querySelector('button[onclick="copyReport()"]');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = "✅ Đã chép";
        btn.classList.replace('btn-primary', 'btn-success');
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.replace('btn-success', 'btn-primary');
        }, 2000);
    });
}

function syncRange(val) {
    let v = parseInt(val);
    if (v > 100) v = 100;
    if (v < 0 || isNaN(v)) v = 0;
    document.getElementById('progressRange').value = v;
}

function syncInput(val) {
    document.getElementById('ghichu').value = val;
}
// Làm mới vùng nội dung báo cáo
function resetReportArea() {
    const reportArea = document.getElementById('reportText');
    if (reportArea) {
        reportArea.value = ""; 
    }
}
// Hàm đóng/mở menu ẩn
function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    if (menu.style.width === "250px") {
        menu.style.width = "0";
    } else {
        menu.style.width = "250px";
    }
}