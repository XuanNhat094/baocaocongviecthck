const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzgX1RvgaxsBZn-GIfr1EaPSBxAZqn1mvE0MZGovnAN1UW0rV_tk4HV-BN34FkF6xfV/exec";

// Cache các phần tử DOM dùng chung để không phải tìm lại nhiều lần
const dom = {
    tbody: document.querySelector('#machineTable tbody'),
    loading: document.getElementById('loading'),
    searchInput: document.getElementById("searchInput")
};

let cachedData = [];

async function loadData() {
    showLoading(true);
    try {
        // Thêm timestamp để tránh cache trình duyệt nếu cần dữ liệu mới nhất
        const res = await fetch(`${WEB_APP_URL}?t=${Date.now()}`);
        cachedData = await res.json();
        renderTable(cachedData);
    } catch (e) {
        console.error("Lỗi:", e);
        // Thay vì alert gây đứng script, ta ghi vào console hoặc hiển thị UI
        if(dom.tbody) dom.tbody.innerHTML = '<tr><td colspan="4">Lỗi tải dữ liệu</td></tr>';
    } finally {
        showLoading(false);
    }
}

function renderTable(data) {
    if (!dom.tbody) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Tối ưu: Dùng mảng tạm và join để render 1 lần duy nhất
    const rowsHtml = data.map(row => {
        const [id, code, name, lastDateRaw, cycleStr, sdate] = row;
        const cycle = parseInt(cycleStr);
        
        if (!sdate || isNaN(cycle)) return '';

        const sLast = new Date(sdate);
        const sNextTime = sLast.getTime() + (cycle * 86400000);

        // Tính toán trạng thái bảo hành
        const isExpired = todayTime >= sNextTime;
        const stText1 = isExpired ? "Hết bảo hành" : "Còn bảo hành";
        const stClass1 = isExpired ? "st-danger" : "st-success";
        
        // SỬA LỖI: Định nghĩa stText dựa trên trạng thái bảo hành (hoặc logic riêng của bạn)
        const rowStatus = isExpired ? "expired" : "active";

        return `
            <tr data-status="${rowStatus}">
                <td>${id || ''}</td>
                <td>${name || ''}</td>
                <td>${code || ''}</td>
                <td><span class="status ${stClass1}">${stText1}</span></td>
            </tr>`;
    }).join('');

    dom.tbody.innerHTML = rowsHtml;
}

// Tăng tốc tìm kiếm bằng cách duyệt trực tiếp row thay vì query lại từ đầu
function filterByText() {
    const filter = dom.searchInput.value.toUpperCase();
    const rows = dom.tbody.getElementsByTagName("tr");
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Chỉ lấy textContent một lần để so sánh
        const text = row.textContent || row.innerText;
        row.style.display = text.toUpperCase().includes(filter) ? "" : "none";
    }
}

function filterByStatus(status) {
    const rows = dom.tbody.getElementsByTagName("tr");
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowStatus = row.getAttribute("data-status");
        row.style.display = (status === 'all' || rowStatus === status) ? "" : "none";
    }
}

function showLoading(s) { 
    if(dom.loading) dom.loading.style.display = s ? 'flex' : 'none'; 
}

// Khởi chạy
loadData();