import { useId, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { useListboxKeyboard } from '@/hooks/useListboxKeyboard'
import { formatCalendarDateLabel, useCalendarKeyboard } from '@/hooks/useCalendarKeyboard'
import styles from '@/features/report/report.module.css'

export interface ReportChartPoint {
  label: string
  amount: number
}

export interface ReportBarChartProps {
  titlePrefix: string
  titleSuffix: string
  data: ReportChartPoint[]
  chartClass: string
  type: 'date' | 'month'
  selectorText: string
  selectedDate: string
  selectedMonth: string
  monthlyList: string[]
  onDateChange: (date: string) => void
  onMonthChange: (month: string) => void
  isOpen: boolean
  onToggle: () => void
}

function ReportBarChart({
  titlePrefix,
  titleSuffix,
  data,
  chartClass,
  type,
  selectorText,
  selectedDate,
  selectedMonth,
  monthlyList,
  onDateChange,
  onMonthChange,
  isOpen,
  onToggle,
}: ReportBarChartProps) {
  const { locale, t } = useI18n()
  const initialCalendarMonth = type === 'date' && selectedDate
    ? selectedDate.slice(0, 7)
    : selectedMonth
  const [calendarMonth, setCalendarMonth] = useState(initialCalendarMonth)
  const [calendarYear, calendarMonthNumber] = calendarMonth.split('-').map(Number)
  const monthPickerRef = useRef<HTMLDivElement>(null)
  const dateCalendarId = `report-date-calendar-${useId()}`
  const dateTriggerId = `${dateCalendarId}-trigger`

  const monthListbox = useListboxKeyboard({
    open: type === 'month' && isOpen,
    optionCount: monthlyList.length,
    selectedIndex: monthlyList.indexOf(selectedMonth),
    onOpen: () => { if (!isOpen) onToggle() },
    onClose: () => { if (isOpen) onToggle() },
    onSelect: (index) => onMonthChange(monthlyList[index]),
    rootRef: monthPickerRef,
  })

  const firstWeekday = new Date(calendarYear, calendarMonthNumber - 1, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonthNumber, 0).getDate()
  const selectedCalendarDay = selectedDate.startsWith(`${calendarMonth}-`)
    ? Number(selectedDate.slice(-2)) - 1
    : 0
  const calendarKeyboard = useCalendarKeyboard({
    open: type === 'date' && isOpen,
    dayCount: daysInMonth,
    selectedIndex: selectedCalendarDay,
    calendarId: dateCalendarId,
    triggerId: dateTriggerId,
    onClose: () => { if (isOpen) onToggle() },
  })
  const maxAmount = data.length > 0 ? Math.max(...data.map((item) => item.amount)) : 0
  const axisValues = [
    maxAmount,
    Math.round(maxAmount * 0.75),
    Math.round(maxAmount * 0.5),
    Math.round(maxAmount * 0.25),
    0,
  ]

  const moveCalendarMonth = (amount: number) => {
    const next = new Date(calendarYear, calendarMonthNumber - 1 + amount, 1)
    setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <section className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h2>
          {titlePrefix}
          <span className={styles.highlightTitle}>{titleSuffix}</span>
        </h2>

        {type === 'date' ? (
          <div>
            <button
              id={dateTriggerId}
              type="button"
              className={styles.selectorBtn}
              aria-label={t('report.dateSelect')}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              aria-controls={dateCalendarId}
              onClick={onToggle}
            >
              <span>{selectorText}</span>
              <span className={styles.selectorChevron} aria-hidden="true" />
            </button>
            {isOpen && (
              <div id={dateCalendarId} className={styles.calendar} role="dialog" aria-label={t('report.calendar')} onKeyDown={calendarKeyboard.onKeyDown}>
                <header>
                  <button type="button" aria-label={t('report.previousMonth')} onClick={() => moveCalendarMonth(-1)}>‹</button>
                  <strong>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(new Date(calendarYear, calendarMonthNumber - 1, 1))}</strong>
                  <button type="button" aria-label={t('report.nextMonth')} onClick={() => moveCalendarMonth(1)}>›</button>
                </header>
                <div className={styles.weekdays}>
                  {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => <span key={day}>{t(`calendar.weekday.${day}`)}</span>)}
                </div>
                <div className={styles.days}>
                  {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
                  {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day, index) => {
                    const value = `${calendarMonth}-${String(day).padStart(2, '0')}`
                    const currentDayDate = new Date(value)
                    const selected = selectedDate ? new Date(selectedDate) : null
                    const startRange = selected ? new Date(selected) : null
                    if (startRange && selected) startRange.setDate(selected.getDate() - 6)
                    const isWithinRange = Boolean(
                      currentDayDate && startRange && selected
                      && currentDayDate >= startRange
                      && currentDayDate <= selected,
                    )

                    return (
                      <button
                        key={day}
                        data-calendar-index={index}
                        type="button"
                        aria-label={formatCalendarDateLabel(value, locale)}
                        aria-current={selectedDate === value ? 'date' : undefined}
                        aria-pressed={selectedDate === value}
                        data-in-range={isWithinRange}
                        onClick={() => {
                          onDateChange(value)
                          setCalendarMonth(value.slice(0, 7))
                          onToggle()
                        }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.monthPicker} ref={monthPickerRef}>
            <button
              type="button"
              className={styles.selectorBtn}
              onClick={monthListbox.onTriggerClick}
              aria-label={t('report.monthSelect')}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-controls={monthListbox.listboxId}
              aria-activedescendant={monthListbox.activeDescendantId}
              onKeyDown={monthListbox.onTriggerKeyDown}
            >
              <span>{selectorText}</span>
              <span className={styles.selectorChevron} aria-hidden="true" />
            </button>
            {isOpen && (
              <div id={monthListbox.listboxId} className={styles.monthMenu} role="listbox" aria-label={t('report.monthSelect')}>
                {monthlyList.map((monthStr, index) => {
                  const [year, month] = monthStr.split('-').map(Number)
                  const formattedMonth = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit' })
                    .format(new Date(year, month - 1, 1))
                  return (
                    <button
                      key={monthStr}
                      type="button"
                      role="option"
                      id={monthListbox.getOptionId(index)}
                      tabIndex={-1}
                      aria-selected={monthStr === selectedMonth}
                      onMouseEnter={() => monthListbox.onOptionPointerMove(index)}
                      onClick={() => monthListbox.onOptionClick(index)}
                    >
                      {formattedMonth}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.chartBody}>
        <div className={styles.axisLabels} aria-hidden="true">
          {axisValues.map((value, index) => <span key={`${value}-${index}`}>{value.toLocaleString(locale)}</span>)}
        </div>
        <div className={chartClass} data-testid="report-visual-chart" aria-hidden="true">
          {data.map((item, index) => {
            const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0
            const isHighest = item.amount === maxAmount && maxAmount > 0
            const isLabelHighlighted = type === 'date' ? index === data.length - 1 : isHighest
            return (
              <div className={styles.barColumn} key={item.label}>
                <div className={styles.barArea}>
                  {isHighest && item.amount > 0 && <span className={styles.amountTooltip}>₩ {item.amount.toLocaleString(locale)}</span>}
                  <span
                    className={`${styles.bar} ${isHighest ? styles.currentBar : ''}`}
                    style={{ height: `${height}%` }}
                    title={`${item.label} ${item.amount.toLocaleString(locale)}`}
                  />
                </div>
                <span className={isLabelHighlighted ? styles.currentLabel : undefined}>{item.label}</span>
              </div>
            )
          })}
        </div>
        <ul className={styles.chartSummary} data-testid="report-chart-summary" aria-label={`${titlePrefix}${titleSuffix}`}>
          {data.map((item) => <li key={`summary-${item.label}`}>{item.label}: {item.amount.toLocaleString(locale)}</li>)}
        </ul>
      </div>
    </section>
  )
}

export default ReportBarChart
