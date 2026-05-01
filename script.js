const G_URL = "https://script.google.com/macros/s/AKfycbzwW5Taa_YOZ1DF_mJGQ4-UStSUCg8WYzldkC_v1nwianvF3oUdsA0n9x04jDI4DdrB0A/exec";
// --- CẤU HÌNH HỆ THỐNG ---
const MY_SECRET_CODE = "KLM0505"; // Đổi mã PIN tại đây
const LOGIN_VERSION = "2026.05.01"; // CHỈ CẦN ĐỔI SỐ NÀY ĐỂ RESET TẤT CẢ THIẾT BỊ

window.onload = function() {
    // Lấy phiên bản đăng nhập đã lưu trên máy người dùng
    const savedVersion = localStorage.getItem("loginVersion");

    // Nếu phiên bản trên máy khách khác với phiên bản hiện tại trong code -> RESET
    if (savedVersion !== LOGIN_VERSION) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("reportUser");
        // Có thể xóa thêm các dữ liệu khác nếu cần
    }

    // Kiểm tra trạng thái sau khi đã lọc phiên bản
    if (localStorage.getItem("isLoggedIn") === "true") {
        const loginOverlay = document.getElementById("loginOverlay");
        if (loginOverlay) loginOverlay.style.display = "none";
    }

    // ... các phần xử lý thời gian và loadData giữ nguyên ...
};

function checkLogin() {
    const inputCode = document.getElementById("accessCode").value;
    const nameInput = document.getElementById("userNameInput").value.trim();
    const errorMsg = document.getElementById("loginError");

    if (inputCode === MY_SECRET_CODE && nameInput !== "") {
        // Khi đăng nhập thành công, lưu cả trạng thái và phiên bản hiện tại
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("reportUser", nameInput);
        localStorage.setItem("loginVersion", LOGIN_VERSION); // Lưu dấu vân tay phiên bản
        
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
    
    const noidung = document.getElementById('noidung').value;
    const nhansu = document.getElementById('nhansu').value;
    const reporter = localStorage.getItem("reportUser") || "Ẩn danh";

    if(!noidung || !nhansu) {
        return alert("⚠️ Vui lòng nhập đầy đủ Nội dung và Nhân sự!");
    }

    const params = new URLSearchParams();
    params.append('jobContent', noidung);
    params.append('worker', nhansu);
    params.append('status', document.getElementById('trangthai').value);
    params.append('note', document.getElementById('ghichu').value);
    params.append('customDate', document.getElementById('ngay').value);
    params.append('reporter', reporter);

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
        document.getElementById('noidung').value = "";
        document.getElementById('ghichu').value = "";
        loadData();
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

    const filtered = allData.filter(item => {
        if(!item.ngay) return false;
        const itemDate = new Date(item.ngay).toISOString().split('T')[0];
        return itemDate === filterVal;
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
            content += `- ${nd} (${ns}) ${gc}\n`;
        });
    }
    reportArea.value = content;
}

function copyReport() {
    const copyText = document.getElementById("reportText");
    if (!copyText.value || copyText.value.includes("Đang tải")) return;

    copyText.select();
    copyText.setSelectionRange(0, 99999);

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
function updateProgress(val) {
    // Cập nhật con số hiển thị trên nhãn (label)
    document.getElementById('progressValue').innerText = val;
}
function syncRange(val) {
    if (val > 100) val = 100;
    if (val < 0) val = 0;
    document.getElementById('progressRange').value = val;
}

// Khi kéo thanh trượt -> số trong ô input nhảy theo
function syncInput(val) {
    document.getElementById('ghichu').value = val;
}
