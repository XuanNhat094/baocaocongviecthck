const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzgX1RvgaxsBZn-GIfr1EaPSBxAZqn1mvE0MZGovnAN1UW0rV_tk4HV-BN34FkF6xfV/exec";

// Lưu trữ element để tái sử dụng, tránh truy vấn DOM nhiều lần
const dom = {
    tbody: document.querySelector('#machineTable tbody'),
    searchInput: document.getElementById("searchInput"),
    loading: document.getElementById('loading')
};

async function loadData() {
    showLoading(true);
    try {
        const res = await fetch(WEB_APP_URL);
        const data = await res.json();
        renderTable(data);
    } catch (e) {
        console.error(e);
        alert("Lỗi tải dữ liệu!");
    } finally {
        showLoading(false);
    }
}

function renderTable(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MS_PER_DAY = 86400000; // 1000 * 60 * 60 * 24

    const rowsHtml = data.map(row => {
        const [id, code, name, lastDateRaw, cycleRaw] = row;
        const cycle = parseInt(cycleRaw);

        if (!lastDateRaw || !cycle) return '';

        const dLast = new Date(lastDateRaw);
        
        // Định dạng YYYY-MM-DD nhanh chóng bằng ISOString
        const lastDateStr = dLast.toISOString().split('T')[0];
        
        const dNext = new Date(dLast);
        dNext.setDate(dLast.getDate() + cycle);
        dNext.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((dNext - today) / MS_PER_DAY);

        let stText = "AN TOÀN", stClass = "st-success";
        if (diffDays <= 0) { 
            stText = "CẦN BẢO TRÌ"; 
            stClass = "st-danger"; 
        } else if (diffDays <= 2) { 
            stText = "SẮP ĐẾN HẠN"; 
            stClass = "st-warning"; 
        }

        return `
            <tr data-status="${stText}">
                <td>${code}</td>
                <td>${name}</td>
                <td><b style="color:var(--primary)">${dNext.toLocaleDateString('vi-VN')}</b></td>
                <td><span class="status ${stClass}">${stText}</span></td>
                <td>
                    <div class="update-box">
                        <input type="date" class="date-input" id="date-${code}" value="${lastDateStr}">
                        <button class="btn-up" onclick="updateMachineDate('${code}')">Lưu</button>
                    </div>
                </td>
            </tr>`;
    }).join(''); 

    dom.tbody.innerHTML = rowsHtml; 
}

async function updateMachineDate(code) {
    const newDate = document.getElementById(`date-${code}`).value;
    if (!confirm(`Xác nhận thay đổi ngày cho máy ${code}?`)) return;

    showLoading(true);
    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify({ action: "updateDate", code: code, newDate: newDate })
        });
        alert("Đã cập nhật thành công!");
        loadData();
    } catch (e) {
        alert("Lỗi cập nhật!");
    } finally {
        showLoading(false);
    }
}

function filterByStatus(s) {
    const rows = dom.tbody.getElementsByTagName("tr");
    for (let r of rows) {
        const match = (s === 'all' || r.getAttribute("data-status") === s);
        r.style.display = match ? "" : "none";
    }
}

function filterByText() {
    const filter = dom.searchInput.value.toUpperCase();
    const rows = dom.tbody.getElementsByTagName("tr");
    for (let r of rows) {
        const text = r.textContent || r.innerText;
        r.style.display = text.toUpperCase().includes(filter) ? "" : "none";
    }
}

function showLoading(s) {
    dom.loading.style.display = s ? 'block' : 'none';
}

loadData();