import Chart, { Tooltip } from 'chart.js/auto';

/* ────────────────────────────────────────────────────────────
 * 공통 툴팁 positioner 등록
 * ──────────────────────────────────────────────────────────── */
// 가로 누적 막대에서 툴팁을 세그먼트 가로 정중앙(시작 base ~ 끝 x 의 중간)에 앵커
// 사용: options.plugins.tooltip.position = 'segMiddle'
// ※ Chart.Tooltip 은 UMD(전역) 빌드 전용이라 번들에서는 named import 로 가져와야 함
Tooltip.positioners.segMiddle = function (elements) {
  if (!elements.length) return false;
  const el = elements[0].element;
  return { x: (el.x + el.base) / 2, y: el.y };
};

// 세로 막대에서 툴팁을 막대 "바로 위"에 앵커
// (활성 요소 중 가장 위쪽 y = 스택 최상단, x = 막대 가로 중앙)
// 사용: options.plugins.tooltip.position = 'barTop'
Tooltip.positioners.barTop = function (elements) {
  if (!elements.length) return false;
  const top = Math.min(...elements.map((e) => e.element.y));
  return { x: elements[0].element.x, y: top };
};

/* ────────────────────────────────────────────────────────────
 * CommonChart : 차트 생성 공통 모듈
 * ──────────────────────────────────────────────────────────── */
window.common = window.common || {};
const instances = {};

window.common.CommonChart = {
  /**
   * 차트 생성. 같은 elementId로 생성된 차트가 있으면 파괴 후 재생성한다.
   * @param {string} elementId - canvas 요소 id
   * @param {object} options - Chart.js 설정 객체 ({ type, data, options })
   * @returns {Chart} 생성된 차트 인스턴스
   */
  create(elementId, options) {
    instances[elementId]?.destroy();

    const chart = new Chart(document.getElementById(elementId), options);
    instances[elementId] = chart;
    return chart;
  },

  /** 저장된 차트 인스턴스 조회 */
  getInstance(elementId) {
    return instances[elementId];
  }
};
