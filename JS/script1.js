// ==================== CẤU HÌNH ĐƯỜNG DẪN WEB APP ====================
const G_URL = "https://script.google.com/macros/s/AKfycbzwW5Taa_YOZ1DF_mJGQ4-UStSUCg8WYzldkC_v1nwianvF3oUdsA0n9x04jDI4DdrB0A/exec";
const DEVICE_URL = "https://script.google.com/macros/s/AKfycbzgX1RvgaxsBZn-GIfr1EaPSBxAZqn1mvE0MZGovnAN1UW0rV_tk4HV-BN34FkF6xfV/exec";

const LOGIN_VERSION = "2026.06.03"; 

// ==================== BIẾN TOÀN CỤC BỘ NHỚ TẠM ====================
let allData = [];      
let db_accounts = {};  
let ALL_DEVICES = [];  // Lưu mảng danh sách hàng (rows) từ sheet thiết bị

// ==================== KHỞI TẠO KHI TẢI TRANG ====================
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
    loadDeviceList(); // Tải danh sách thiết bị
};

// ==================== QUẢN LÝ ĐĂNG NHẬP & TÀI KHOẢN ====================
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

// ==================== TẢI DỮ LIỆU TỪ GOOGLE SHEETS ====================
async function loadData() {
    const reportArea = document.getElementById('reportText');
    
    // Hiển thị trạng thái đang làm mới dữ liệu trong khung text
    if (reportArea) {
        reportArea.value = "⏳ Đang đồng bộ và làm mới dữ liệu...";
    }

    try {
        // Thêm tham số timestamp (?_cc=...) để ép trình duyệt xóa cache, lấy dữ liệu gốc mới nhất từ Sheets
        const res = await fetch(`${G_URL}?_cc=${new Date().getTime()}`);
        const json = await res.json();
        
        allData = json.reports || [];
        db_accounts = json.accounts || {};

        // Cập nhật lại bộ nhớ đệm máy
        localStorage.setItem("cached_accounts", JSON.stringify(db_accounts));
        
        // Cập nhật lại danh sách chọn tên nhân sự
        renderUserSelect();
        
        // TỰ ĐỘNG CHẠY HÀM LỌC: Đổ ngay dữ liệu mới vào ô copy báo cáo
        filterData();
        
        console.log("✅ Ô copy đã được làm mới dữ liệu mới nhất!");
    } catch (e) {
        if (reportArea) {
            reportArea.value = "⚠️ Lỗi làm mới dữ liệu. Vui lòng thử lại.";
        }
        console.error("Lỗi khi click làm mới:", e);
    }
}

// Hàm tải danh mục thiết bị từ DEVICE_URL
async function loadDeviceList() {
    try {
        const res = await fetch(DEVICE_URL);
        const json = await res.json();
        
        // Nhận mảng thiết bị linh hoạt theo các kiểu trả về của file GS cũ thiết bị
        ALL_DEVICES = json.devices || json.data || json || [];
        console.log("Đã tải danh mục máy:", ALL_DEVICES);
    } catch (e) {
        console.error("Không thể nạp danh mục máy:", e.message);
    }
}

// ==================== SỬA TẠI ĐÂY: LOGIC TỰ ĐIỀN TÊN MÁY TỪ SHEET MỚI ====================
function autoFillDeviceName(maSo) {
    const txtTenMay = document.getElementById('noidung2');
    if (!txtTenMay) return;

    const maTimKiem = maSo.trim().toUpperCase();

    // Nếu để trống hoặc chưa nhập xong mã thì xóa trắng ô tên máy
    if (maTimKiem === "" || maTimKiem === "KLM-CK-") {
        txtTenMay.value = "";
        return;
    }

    // So sánh mã số nhập vào với Cột B và lấy Tên máy ở Cột C
    const thietBiTimThay = ALL_DEVICES.find(item => {
        if (Array.isArray(item)) {
            // Trường hợp dữ liệu sheet trả về dạng mảng thuần túy các dòng: row[1] chính là Cột B
            return (item[1] || "").toString().trim().toUpperCase() === maTimKiem;
        } else if (item && typeof item === 'object') {
            // Trường hợp dữ liệu trả về dạng Object đã map tiêu đề cột:
            // Tự động quét qua các thuộc tính phổ biến của Cột B (mamay, macode, code...)
            const maTrongHeThong = (item.mamay || item.macode || item.code || item.maThietBi || "").toString().trim().toUpperCase();
            return maTrongHeThong === maTimKiem;
        }
        return false;
    });

    if (thietBiTimThay) {
        if (Array.isArray(thietBiTimThay)) {
            // Nếu tìm thấy dạng mảng dòng: item[2] chính là giá trị Cột C (Tên máy)
            txtTenMay.value = thietBiTimThay[2] || "";
        } else {
            // Nếu tìm thấy dạng Object: lấy thuộc tính tên máy tương ứng ở Cột C
            txtTenMay.value = thietBiTimThay.tenmay || thietBiTimThay.tenthietbi || thietBiTimThay.noidung || "";
        }
    } else {
        txtTenMay.value = ""; // Không tìm thấy mã máy tương thích thì chừa trống để tự điền tay
    }
}

// ==================== GỬI BÁO CÁO CÔNG VIỆC ====================
async function sendWorkReport() {
    const btn = document.getElementById('btnSubmit');
    const text = document.getElementById('btnText');
    const loader = document.getElementById('loadingSpinner');
    
    const noidung1 = document.getElementById('noidung1').value;
    const noidung2 = document.getElementById('noidung2').value.trim();
    const noidung3 = document.getElementById('noidung3').value.trim(); 
    const noidung4 = document.getElementById('noidung4').value.trim();
    
    const nhansu = document.getElementById('nhansu').value.trim();
    const reporter = localStorage.getItem("reportUser") || "Ẩn danh";
    const ngayReport = document.getElementById('ngay').value;
    const tienDo = document.getElementById('ghichu').value;
    const trangthai = document.getElementById('trangthai').value;

    if (!noidung2 || !nhansu) return alert("⚠️ Vui lòng nhập đầy đủ tên máy, nội dung và nhân sự!");

    const noidungHoanChinh = `${noidung1} ${noidung2} ${noidung3} ${noidung4}`;

    const payload = {
        jobContent: noidungHoanChinh,
        status: trangthai,
        worker: nhansu,
        note: tienDo,
        reporter: reporter
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
        
        allData.unshift({ 
            ngay: ngayReport, 
            noidung: noidungHoanChinh, 
            trangthai: trangthai, 
            nhansu: nhansu, 
            ghichu: tienDo 
        });
        
        document.getElementById('noidung2').value = "";
        document.getElementById('noidung4').value = "";
        filterData();
    } catch (err) {
        alert("❌ Lỗi gửi: " + err.message);
    } finally {
        if (btn) btn.disabled = false;
        if (text) text.innerText = "GỬI BÁO CÁO";
        if (loader) loader.style.display = "none";
    }
}

// ==================== LỌC DỮ LIỆU & HIỂN THỊ ====================
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
            content += `- ${item.noidung} (${item.nhansu}) [${item.trangthai || "Hoàn thành"}]${gc}\n`;
        });
    }
    reportArea.value = content;
}

// ==================== SAO CHÉP BÁO CÁO NHANH ====================
function copyReport() {
    const copyText = document.getElementById("reportText");
    if (!copyText || !copyText.value || copyText.value.includes("Đang tải")) return;

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

// ==================== ĐỒNG BỘ THANH TIẾN ĐỘ (%) & TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI ====================

// Hàm chạy khi bạn kéo thanh gạt (Range)
function syncInput(val) {
    const gc = document.getElementById('ghichu');
    if (gc) gc.value = val;
    
    // Tự động cập nhật trạng thái dựa vào phần trăm
    updateStatusByProgress(val);
}

// Hàm chạy khi bạn gõ số vào ô nhập liệu (Input số)
function syncRange(val) {
    let v = Math.min(100, Math.max(0, parseInt(val) || 0));
    const pr = document.getElementById('progressRange');
    if (pr) pr.value = v;
    
    // Tự động cập nhật trạng thái dựa vào phần trăm
    updateStatusByProgress(v);
}

// Hàm phụ trách kiểm tra số % để tự động đổi tùy chọn ở ô Trạng thái
function updateStatusByProgress(progressValue) {
    const txtTrangThai = document.getElementById('trangthai');
    if (!txtTrangThai) return;

    let p = parseInt(progressValue) || 0;

    if (p === 100) {
        // Nếu giá trị là 100%, chọn trạng thái "Hoàn thành"
        // Bạn hãy kiểm tra xem trong file HTML, thuộc tính value của option Hoàn thành là gì (Ví dụ: "Hoàn thành" hoặc "Done")
        txtTrangThai.value = "Hoàn thành"; 
    } else {
        // Nếu dưới 100%, chọn trạng thái "Đang thực hiện"
        // Kiểm tra xem trong file HTML, option Đang thực hiện có value chính xác là gì nhé
        txtTrangThai.value = "Đang thực hiện"; 
    }
}
// ==================== HIỂN THỊ MENU SIDEBAR ====================
function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    if (menu) menu.style.width = (menu.style.width === "270px") ? "0" : "270px";
}