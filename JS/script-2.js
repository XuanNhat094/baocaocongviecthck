const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzgX1RvgaxsBZn-GIfr1EaPSBxAZqn1mvE0MZGovnAN1UW0rV_tk4HV-BN34FkF6xfV/exec";

// Cache các phần tử DOM dùng chung
const dom = {
    tbody: document.querySelector('#machineTable tbody'),
    loading: document.getElementById('loading'),
    searchInput: document.getElementById("searchInput")
};

let cachedData = [];

async function loadData() {
    showLoading(true);
    try {
        const res = await fetch(`${WEB_APP_URL}?t=${Date.now()}`);
        cachedData = await res.json();
        renderTable(cachedData);
    } catch (e) {
        console.error("Lỗi:", e);
        if (dom.tbody) dom.tbody.innerHTML = '<tr><td colspan="4" class="text-center">Lỗi tải dữ liệu</td></tr>';
    } finally {
        showLoading(false);
    }
}

function renderTable(data) {
    if (!dom.tbody) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const rowsHtml = data.map(row => {
        const [id, code, name, lastDateRaw, nextPlanStr, sdate] = row;
        const cycle = parseInt(sdate);

        let stText1 = "Không xác định";
        let stClass1 = "st-warning"; 
        let rowStatus = "unknown";

        // Kiểm tra nếu sdate tồn tại và cycle hợp lệ
        if (sdate && !isNaN(cycle)) {
            const sLast = new Date(sdate);
            
            // Kiểm tra xem Date có hợp lệ không (tránh trường hợp sdate là chuỗi rác)
            if (!isNaN(sLast.getTime())) {
                const sNextTime = sLast.getTime() + (cycle * 86400000);
                const isExpired = todayTime >= sNextTime;

                stText1 = isExpired ? "Hết bảo hành" : "Còn bảo hành";
                stClass1 = isExpired ? "st-danger" : "st-success";
                rowStatus = isExpired ? "expired" : "active";
            }
        }

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

function filterByText() {
    if (!dom.tbody) return;
    const filter = dom.searchInput.value.toUpperCase();
    const rows = dom.tbody.getElementsByTagName("tr");
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = row.textContent || row.innerText;
        row.style.display = text.toUpperCase().includes(filter) ? "" : "none";
    }
}

function filterByStatus(status) {
    if (!dom.tbody) return;
    const rows = dom.tbody.getElementsByTagName("tr");
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowStatus = row.getAttribute("data-status");
        row.style.display = (status === 'all' || rowStatus === status) ? "" : "none";
    }
}

function showLoading(s) { 
    if (dom.loading) dom.loading.style.display = s ? 'flex' : 'none'; 
}

// Khởi chạy
loadData();