'use strict'
/** MES 原生化（P3-B）：按模块登记已内迁的 action → handler(db, profile, input)。 */
const scope = require('./scope')
const calendar = require('./calendar')
const { listSchedules } = require('./schedules-read')
const reports = require('./reports-read')
const attendance = require('./attendance-read')
const jobs = require('./jobs-read')
const handovers = require('./handovers-read')
const auditRead = require('./audit-read')
const { saveCatalog } = require('./catalogs-write')
const { saveSchedule } = require('./schedules-write')

const handlers = {
    // 第 1 模块：scope/profile + bootstrap
    bootstrap: (db, profile) => scope.bootstrap(db, profile),
    // 第 2 模块：排班月历 + 排班列表（只读）
    scheduleCalendar: (db, profile, input) => calendar.scheduleCalendar(db, profile, input),
    myScheduleDay: (db, profile, input) => calendar.myScheduleDay(db, profile, input),
    listSchedules: (db, profile, input) => listSchedules(db, profile, input),
    // 第 3 模块：报表与工作台（只读）
    report: (db, profile, input) => reports.report(db, profile, input),
    dashboard: (db, profile, input) => reports.dashboard(db, profile, input),
    // 第 4 模块：考勤只读
    attendanceSummary: (db, profile, input) => attendance.attendanceSummary(db, profile, input),
    listAttendance: (db, profile, input) => attendance.listAttendance(db, profile, input),
    myAttendance: (db, profile, input) => attendance.myAttendance(db, profile, input),
    attendanceHistory: (db, profile, input) => attendance.attendanceHistory(db, profile, input),
    // 第 5 模块：工单 / 交接班 / 异常（只读）
    listJobs: (db, profile, input) => jobs.listJobs(db, profile, input),
    getJob: (db, profile, input) => jobs.getJob(db, profile, input),
    listHandovers: (db, profile, input) => handovers.listHandovers(db, profile, input),
    getHandover: (db, profile, input) => handovers.getHandover(db, profile, input),
    listExceptions: (db, profile, input) => handovers.listExceptions(db, profile, input),
    // 第 6 模块：操作审计（含日期范围参数）
    audit: (db, profile, input) => auditRead.audit(db, profile, input),
    // P3-B1：catalogs / schedules 写（灰度开关控制，默认 forward 直到切换）
    saveCatalog: (db, profile, input) => saveCatalog(db, profile, input),
    saveSchedule: (db, profile, input) => saveSchedule(db, profile, input),
}

module.exports = { handlers }
