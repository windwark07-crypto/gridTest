document.addEventListener("DOMContentLoaded", function () {
    const table = new Tabulator("#serviceGrid", {
        layout: "fitColumns",
        // height: "400px",
        width: "1000px",
        selectableRows: true,
        // 표준 에디터(Age·MEMO·Gender 등) 편집 시 수정 상태 마킹
        cellEdited: function (cell) {
            GridUtil.markState(cell.getRow(), "modified");
        },
        columns: GridUtil.columns([
            {
                formatter: "rowSelection",
                titleFormatter: "rowSelection",
                hozAlign: "center",
                headerHozAlign: "center",
                headerSort: false,
                width: 40
            },
            { title: "ID", field: "id", width: 80 },
            {
                title: "사진",
                field: "photo",
                hozAlign: "center",
                width: 70,
                formatter: "image",
                formatterParams: { height: "32px", width: "32px" }
            },
            { title: "Name", field: "name" },
            { title: "Age", field: "age", editor: "number", editorParams: { min: 0, max: 150 } },
            { title: "MEMO", field: "memo", editor: "input", cssClass: "editable-input" },
            {
                title: "Status",
                field: "status",
                formatter: "tag",
                formatterParams: {
                    colors: { Active: "#2DC214", Inactive: "#CE1515" },
                    labels: { Active: "사용중", Inactive: "미사용" }
                }
            },
            {
                title: "Gender",
                field: "gender",
                editor: "list",
                editorParams: {
                    values: {'01':'카카오', '02':'네이버'}
                },
                cssClass: "editable-list",
                formatter:'lookup',
                formatterParams: {'01':'카카오', '02':'네이버'}
            },
            {
                title: "사용여부",
                field: "use",
                formatter: "checkbox",
                hozAlign: "center",
                width: 100
            },
            {
                title: "상세",
                field: "detail",
                hozAlign: "center",
                headerHozAlign: "center",
                headerSort: false,
                width: 80,
                formatter: "button",
                formatterParams: {
                    label: "상세",
                    onClick: function (e, cell) {
                        const rowData = cell.getRow().getData();
                        // TODO: 상세 화면 이동 등 실제 로직으로 교체
                        console.log("상세 클릭:", rowData);
                        alert("상세 보기 - ID: " + rowData.id + ", 이름: " + rowData.name);
                    }
                }
            },
        ]),
        data: [
            { id: 1, name: "Alice", photo: "https://i.pravatar.cc/40?img=1", age: 12, memo: "메모1", status: "Active", gender: "01", use: true },
            { id: 2, name: "Bob", photo: "https://i.pravatar.cc/40?img=2", age: 33, memo: "메모2", status: "Inactive", gender: "01", use: false },
            { id: 3, name: "Carol", photo: "https://i.pravatar.cc/40?img=3", age: 50, memo: "메모3", status: "Active", gender: "02", use: true },
        ],
    });

    // ── 툴바 버튼 ──────────────────────────────────────────────
    // 행 추가 (_state = "new")
    document.getElementById("btnAddRow").addEventListener("click", function () {
        GridUtil.addRow(table, { name: "", age: 0, memo: "", status: "", gender: "01", use: false });
    });

    // 선택 행 삭제 (_state = "deleted", 삭제분은 별도 보관)
    document.getElementById("btnDeleteRow").addEventListener("click", function () {
        const rows = table.getSelectedRows();
        if (rows.length === 0) {
            alert("삭제할 행을 선택하세요.");
            return;
        }
        rows.forEach(function (row) {
            GridUtil.deleteRow(row);
        });
    });

    // 변경분 저장 (서버 전송 대신 콘솔 출력으로 확인)
    document.getElementById("btnSave").addEventListener("click", function () {
        const changes = GridUtil.getChanges(table);
        console.log("신규+수정:", changes.upserts);
        console.log("삭제:", changes.deletes);
        console.log("서버 전송 대상(all):", changes.all);
        alert("변경 " + changes.all.length + "건 (신규/수정 " + changes.upserts.length + ", 삭제 " + changes.deletes.length + ")\n콘솔에서 상세 확인");
        // 실제로는 여기서 changes.all 을 서버로 전송하고,
        // 성공 시 GridUtil.clearState(table); 호출
    });
});
