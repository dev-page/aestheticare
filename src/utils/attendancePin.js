export const generateAttendancePin = (length = 6) => {
  const size = Number(length) > 0 ? Number(length) : 6
  let value = ''
  for (let i = 0; i < size; i += 1) {
    value += Math.floor(Math.random() * 10).toString()
  }
  return value
}
