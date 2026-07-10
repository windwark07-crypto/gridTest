document.addEventListener("DOMContentLoaded", function () {
    new Tabulator("#serviceGrid", {
        layout: "fitColumns",
        // height: "400px",
        width: "1000px",
        selectableRows: true,
        columns: [
            {
                formatter: "rowSelection",
                titleFormatter: "rowSelection",
                hozAlign: "center",
                headerHozAlign: "center",
                headerSort: false,
                width: 40
            },
            { title: "ID", field: "id", width: 80 },
            { title: "Name", field: "name" },
            { title: "Age", field: "age", editor: "number", editorParams: { min: 0, max: 150 } },
            { title: "MEMO", field: "memo", editor: "input", cssClass: "editable-input" },
            { title: "Status", field: "status" },
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
        ],
        data: [
            { id: 1, name: "Alice", age: 12, memo: "메모1", status: "Active", gender: "01", use: true },
            { id: 2, name: "Bob", age: 33, memo: "메모2", status: "Inactive", gender: "01", use: false },
            { id: 3, name: "Carol", age: 50, memo: "메모3", status: "Active", gender: "02", use: true },
        ],
    });
});
