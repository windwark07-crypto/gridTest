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
            { title: "Status", field: "status" },
            {
                title: "Gender",
                field: "gender",
                editor: "list",
                editorParams: {
                    values: {'01':'카카오', '02':'네이버'}
                },
                formatter:'lookup',
                formatterParams: {'01':'카카오', '02':'네이버'}
            },
            {
                title: "사용여부",
                field: "use",
                formatter: "tickCross",
                editor: "rowSelection",
                hozAlign: "center",
                width: 100
            },
        ],
        data: [
            { id: 1, name: "Alice", status: "Active", gender: "01", use: true },
            { id: 2, name: "Bob", status: "Inactive", gender: "01", use: false },
            { id: 3, name: "Carol", status: "Active", gender: "02", use: true },
        ],
    });
});
