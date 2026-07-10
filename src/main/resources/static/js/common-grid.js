/**
 * 공통 그리드 설정
 * - 모든 페이지의 index.js보다 먼저 로드되어야 함
 */

Tabulator.extendModule("format", "formatters", {
    // 사용여부 등 boolean 데이터를 실제 체크박스로 표시/편집하는 공통 formatter
    // 컬럼 정의에서 formatter: "checkbox" 만 지정하면 됨
    checkbox: function (cell, formatterParams, onRendered) {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!cell.getValue();

        // 체크박스 변경 시 셀 데이터 갱신
        input.addEventListener("change", function () {
            cell.setValue(input.checked);
        });

        // 클릭이 행 선택 등 상위로 전파되지 않도록 차단
        input.addEventListener("click", function (e) {
            e.stopPropagation();
        });

        return input;
    },

    // 셀에 버튼을 표시하는 공통 formatter
    // 컬럼 정의 예:
    //   formatter: "button",
    //   formatterParams: { label: "상세", onClick: function (e, cell) { ... } }
    button: function (cell, formatterParams, onRendered) {
        const params = formatterParams || {};
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = params.className || "grid-btn";
        btn.textContent = params.label || "버튼";

        btn.addEventListener("click", function (e) {
            // 행 선택 등 상위로 전파되지 않도록 차단
            e.stopPropagation();
            if (typeof params.onClick === "function") {
                params.onClick(e, cell);
            }
        });

        return btn;
    }
});
