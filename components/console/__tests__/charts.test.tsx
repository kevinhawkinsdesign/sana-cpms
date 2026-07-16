import { render } from '@testing-library/react';
import { AreaChart, TelemetryChart, Bars, Spark, fmtKigaliClock, type TelemetryPoint } from '@/components/console/charts';

/**
 * ApexCharts is dynamically imported (`next/dynamic`, ssr: false) so it won't
 * render a real chart inside jsdom. These tests verify the guard/empty-data
 * paths and that the wrapper mounts without throwing.
 */

/* ---------- mock react-apexcharts so dynamic() resolves synchronously ------ */
jest.mock('react-apexcharts', () => {
  const MockChart = (props: Record<string, unknown>) => (
    <div data-testid="apex-chart" data-type={props.type} data-height={props.height} />
  );
  MockChart.displayName = 'MockApexChart';
  return { __esModule: true, default: MockChart };
});

/* ---------- mock next/dynamic to bypass lazy loading ---------------------- */
jest.mock('next/dynamic', () => {
  return (loader: () => Promise<{ default: unknown }>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Comp: any = null;
    const promise = loader();
    promise.then((mod) => {
      Comp = (mod as { default: unknown }).default;
    });
    // Return a wrapper that renders the resolved component
    const DynamicWrapper = (props: Record<string, unknown>) => {
      if (!Comp) return null;
      return <Comp {...props} />;
    };
    DynamicWrapper.displayName = 'DynamicWrapper';
    return DynamicWrapper;
  };
});

/* ---------- stub MutationObserver for useChartTheme ----------------------- */
beforeAll(() => {
  // jsdom doesn't have a real MutationObserver; provide a no-op stub
  if (!global.MutationObserver) {
    global.MutationObserver = class {
      observe() {}
      disconnect() {}
      takeRecords() { return []; }
    } as unknown as typeof MutationObserver;
  }
});

describe('AreaChart', () => {
  it('renders nothing for empty data', () => {
    const { container } = render(<AreaChart data={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the ApexChart component for non-empty data', () => {
    const { getByTestId } = render(<AreaChart data={[10, 20, 30]} />);
    const chart = getByTestId('apex-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('data-type')).toBe('area');
  });

  it('passes height prop to ApexChart', () => {
    const { getByTestId } = render(<AreaChart data={[1, 2]} h={250} />);
    expect(getByTestId('apex-chart').getAttribute('data-height')).toBe('250');
  });
});

describe('TelemetryChart', () => {
  const points: TelemetryPoint[] = [
    { elapsedSec: 0, t: '2026-06-16T10:00:00Z', value: 60 },
    { elapsedSec: 900, t: '2026-06-16T10:15:00Z', value: 88 },
    { elapsedSec: 1800, t: '2026-06-16T10:30:00Z', value: 85 },
  ];

  it('renders nothing for empty data', () => {
    const { container } = render(
      <TelemetryChart points={[]} color="#fff" yLabel="Power (kW)" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the ApexChart component for non-empty data', () => {
    const { getByTestId } = render(
      <TelemetryChart points={points} color="#fff" yLabel="Power (kW)" unit=" kW" format={(v) => v.toFixed(0)} />,
    );
    const chart = getByTestId('apex-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('data-type')).toBe('area');
  });
});

describe('Bars', () => {
  it('renders nothing for empty data', () => {
    const { container } = render(<Bars data={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a bar chart for non-empty data', () => {
    const { getByTestId } = render(<Bars data={[5, 10, 15]} labels={['A', 'B', 'C']} />);
    const chart = getByTestId('apex-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('data-type')).toBe('bar');
  });
});

describe('Spark', () => {
  it('renders nothing for fewer than 2 data points', () => {
    const { container: c0 } = render(<Spark data={[]} />);
    expect(c0.innerHTML).toBe('');
    const { container: c1 } = render(<Spark data={[42]} />);
    expect(c1.innerHTML).toBe('');
  });

  it('renders a sparkline for 2+ data points', () => {
    const { getByTestId } = render(<Spark data={[1, 2, 3]} />);
    const chart = getByTestId('apex-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('data-type')).toBe('area');
  });
});

describe('fmtKigaliClock (KAB-131)', () => {
  it('formats a UTC instant as Kigali (UTC+2) wall-clock time', () => {
    // 10:24 UTC → 12:24 Kigali, independent of the test machine's timezone.
    expect(fmtKigaliClock('2026-06-18T10:24:00Z')).toBe('Jun 18, 12:24 PM');
  });

  it('uses a numeric day (no leading zero) for single-digit days', () => {
    expect(fmtKigaliClock('2026-06-08T10:24:00Z')).toBe('Jun 8, 12:24 PM');
  });

  it('rolls the date over when +2h crosses midnight', () => {
    // 22:05 UTC Jun 18 → 00:05 Kigali Jun 19.
    expect(fmtKigaliClock('2026-06-18T22:05:00Z')).toBe('Jun 19, 12:05 AM');
  });

  it('returns empty string for an invalid timestamp', () => {
    expect(fmtKigaliClock('not-a-date')).toBe('');
  });
});
