document.addEventListener("DOMContentLoaded", function () {
    new Tabulator("#serviceGrid", {
        layout: "fitColumns",
        // height: "400px",
        width: "1000px",
        columns: [
            { title: "ID", field: "id", width: 80 },
            { title: "Name", field: "name" },
            { title: "Status", field: "status" },
            {
                title: "Gender",
                field: "gender",
                editor: "list",
                editorParams: {
                    values: { M: "Male", F: "Female" },
                },
                formatter: function (cell) {
                    var labels = { M: "Male", F: "Female" };
                    var value = cell.getValue();
                    var label = labels[value] || value || "";
                    return (
                        '<span class="gender-cell-inner">' +
                        "<span>" + label + "</span>" +
                        '<span class="gender-arrow">▼</span>' +
                        "</span>"
                    );
                },
            },
        ],
        data: [
            { id: 1, name: "Alice", status: "Active", gender: "F" },
            { id: 2, name: "Bob", status: "Inactive", gender: "M" },
            { id: 3, name: "Carol", status: "Active", gender: "F" },
        ],
    });
});
