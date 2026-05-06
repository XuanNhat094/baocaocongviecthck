const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzgX1RvgaxsBZn-GIfr1EaPSBxAZqn1mvE0MZGovnAN1UW0rV_tk4HV-BN34FkF6xfV/exec";

const dom = {
    tbody: document.querySelector('#machineTable tbody'),
    loading: document.getElementById('loading'),
    searchInput: document.getElementById("searchInput")
};

function getTimestamp(dateStr) {
    if (!dateStr) return 0;
    const p = dateStr.toString().split('T')[0].split(/[-/]/);
    let d;
    if (p[0].length === 4) d = new Date(p[0], p[1] - 1, p[2]); // YYYY-MM-DD
    else d = new Date(p[2], p[1] - 1, p[0]); // DD-MM-YYYY
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

async function loadData() {
    showLoading(true);
    try {
        const res = await fetch(`${WEB_APP_URL}?t=${Date.now()}`);
        const data = await res.json();
        renderTable(data);
    } catch (e) {
        console.error("Lỗi:", e);
        dom.tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Lỗi kết nối dữ liệu!</td></tr>';
    } finally {
        showLoading(false);
    }
}

function renderTable(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const todayISO = today.toLocaleDateString('en-CA'); // "YYYY-MM-DD"

    const rowsHtml = data.map(row => {
        const [id, code, name, lastDateStr, nextPlanStr] = row;
        if (!nextPlanStr) return '';

        const nextTime = getTimestamp(nextPlanStr);
        const lastTime = getTimestamp(lastDateStr);
        
        const remainDays = Math.round((nextTime - todayTime) / 86400000);
        const remainDayd = Math.round((todayTime - lastDateStr) / 86400000);
        let lastDateValue = "";
        if (lastDateStr) {
            const d = new Date(lastTime);
            lastDateValue = d.toLocaleDateString('en-CA');
        }

        let stText = "AN TOÀN", stClass = "st-success";

        if (lastDateValue === todayISO) {
            stText = "AN TOÀN";
            stClass = "st-success";
        } 
        else if (lastTime >= nextTime) {
            stText = "AN TOÀN";
            stClass = "st-success";
        }
        else if (remainDays = 0) {
            stText = "CẦN BẢO TRÌ";
            stClass = "st-danger";
        }
        else if (remainDayd >= 0) {
            stText = "AN TOÀN";
            stClass = "st-success";
        }
        else if (remainDays > 0 && remainDays <= 3) {
            stText = "SẮP ĐẾN HẠN";
            stClass = "st-warning";
        }
        else {
            stText = "AN TOÀN";
            stClass = "st-success";
        }

        return `
            <tr data-status="${stText}" data-done="${lastDateValue === todayISO}">
                <td>${code || ''}</td>
                <td>${name || ''}</td>
                <td><b style="color:#0056b3">${nextPlanStr}</b></td>
                <td><span class="status ${stClass}">${stText}</span></td>
                <td>
                    <div class="update-box">
                        <input type="date" class="date-input" id="date-${code}" value="${lastDateValue}">
                        <button class="btn-up" onclick="updateMachineDate('${code}')">Lưu</button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    dom.tbody.innerHTML = rowsHtml;
}

function filterByStatus(status) {
    const rows = document.querySelectorAll('#machineTable tbody tr');
    rows.forEach(r => {
        const rowStatus = r.getAttribute("data-status");
        if (status === 'all') r.style.display = "";
        else r.style.display = (rowStatus === status) ? "" : "none";
    });
}

function filterByText() {
    const val = dom.searchInput.value.toUpperCase();
    const rows = document.querySelectorAll('#machineTable tbody tr');
    rows.forEach(r => {
        r.style.display = r.innerText.toUpperCase().includes(val) ? "" : "none";
    });
}

function filterTodayDone() {
    const rows = document.querySelectorAll('#machineTable tbody tr');
    rows.forEach(r => {
        r.style.display = (r.getAttribute("data-done") === "true") ? "" : "none";
    });
}

async function updateMachineDate(code) {
    const inputDate = document.getElementById(`date-${code}`).value;
    if (!inputDate) return alert("Vui lòng chọn ngày!");
    if (!confirm(`Xác nhận lưu ngày bảo trì cho máy ${code}?`)) return;

    showLoading(true);
    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify({ action: "updateDate", code: code, newDate: inputDate })
        });
        alert("Thành công!");
        loadData(); 
    } catch (e) {
        alert("Lỗi cập nhật!");
    } finally {
        showLoading(false);
    }
}

function showLoading(s) { 
    if (dom.loading) dom.loading.style.display = s ? 'flex' : 'none'; 
}

loadData();