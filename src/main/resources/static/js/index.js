document.addEventListener("DOMContentLoaded", function () {
    new Tabulator("#serviceGrid", {
        layout: "fitColumns",
        columns: [
            { title: "ID", field: "id", width: 80 },
            { title: "Name", field: "name" },
            { title: "Status", field: "status" },
            {
                title: "Gender",
                field: "gender",
                cssClass: "gender-cell",
                editor: "list",
                editorParams: {
                    values: { M: "Male", F: "Female" },
                },
                formatter: "lookup",
                formatterParams: { M: "Male", F: "Female" },
            },
        ],
        data: [
            { id: 1, name: "Alice", status: "Active", gender: "F" },
            { id: 2, name: "Bob", status: "Inactive", gender: "M" },
            { id: 3, name: "Carol", status: "Active", gender: "F" },
        ],
    });
});
