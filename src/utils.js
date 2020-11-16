const moment = require('moment');

const parseRetroDate = dateString => {
  const timeRegexp = /^(?=\d\d*[hms])(?:(\d\d?)h)?(?:(\d\d*)m)?(?:(\d\d*)s)?$/;
  if (!dateString.match(timeRegexp)) throw new Error(`Invalid retro time format: ${dateString}`);
  const match = timeRegexp.exec(dateString);
  const hours = match[1] || 0,
    minutes = match[2] || 0,
    seconds = match[3] || 0;
  const timestamp = moment()
    .subtract(hours, 'hours')
    .subtract(minutes, 'minutes')
    .subtract(seconds, 'seconds');
  return timestamp.toDate();
};

module.exports.parseRetroDate = parseRetroDate;
