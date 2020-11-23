const NodeHelper = require("node_helper");
const WebUntis = require("webuntis");

module.exports = NodeHelper.create({
	start: function () {
	},

	socketNotificationReceived: function (notification, payload) {

		if (notification === "FETCH_DATA") {

			// iterate through students, fetch and send lessons
			for (let i in payload.students) {
				this.fetchLessons(payload.students[i], payload.days);
			}
		}
	},

	fetchLessons: function (studentData, days) {

		const untis = new WebUntis(
			studentData.school,
			studentData.username,
			studentData.password,
			studentData.server
		);

		if (days < 1 || days > 10 || isNaN(days)) { days = 1; }

		// create lessons array to be sent to module
		var lessons = [];

		// array to get lesson number by start time
		var startTimes = [];

		var rangeStart = new Date();
		var rangeEnd = new Date();

		let responseData = [];

		untis
			.login()
			.then(response => {
				rangeStart.setHours(0, 0, 0, 0);
				rangeEnd.setDate(rangeStart.getDate() + days);
				rangeEnd.setHours(23,59,59,0);

				untis.getTimegrid()
					.then(grid => {
						// use grid of first day and assume all days are the same
						grid[0].timeUnits.forEach(element => {
							startTimes[element.startTime] = element.name;
						})

					})
					.catch(error => {
						console.log("Error in getTimegrid: " + error);
					})

				return untis.getOwnTimetableForRange(rangeStart, rangeEnd);
			})
			.then(timetable => {
				responseData[0] = timetable;
				return untis.getHomeWorksFor(rangeStart, rangeEnd);
			})
			.then(homework => {
				responseData[1] = homework;

				let homeworkMap = new Map();

				if (responseData[1]) {
					var lessonMap = new Map();
					responseData[1].lessons.forEach(l => {
						lessonMap.set(l.id, l.subject);
					});
					responseData[1].homeworks.forEach(h => {
						let year = h.dueDate.toString().substring(0, 4);
						let month = h.dueDate.toString().substring(4, 6);
						let day = h.dueDate.toString().substring(6);
						let key = year + month + day; 
						let entries = homeworkMap.get(key);
						if (!entries) {
							entries = new Map();
						}
						entries.set(lessonMap.get(h.lessonId), h.text);
						console.table(entries);
						homeworkMap.set(key, entries);
					});
				}

				if (responseData[0]) {
					let timetable = responseData[0];
					timetable.forEach(element => {
						let lesson = {};
						let year = element.date.toString().substring(0, 4);
						let month = element.date.toString().substring(4, 6);
						let day = element.date.toString().substring(6);
						let hour = element.startTime.toString();
						let dueDate = year + month + day;
						hour.length == 3 ? hour = "0" + hour.substring(0, 1) : hour = hour.substring(0, 2);
						let minutes = element.startTime.toString()
						minutes = minutes.substring(minutes.length - 2);
						lesson.sortString = element.date + hour + minutes;
						switch (element.code) {
							case "cancelled": lesson.sortString += "1"; break;
							case "irregular": lesson.sortString += "2"; break;
							default: lesson.sortString += "9";
						}
						lesson.year = year;
						lesson.month = month;
						lesson.day = day;
						lesson.hour = hour;
						lesson.minutes = minutes;
						lesson.lessonNumber = startTimes[element.startTime];
						lesson.lessonSortAlt = lesson.lessonNumber + " " + new Date(year, month - 1, hour).getDay();
						element.su[0] ? lesson.subject = element.su[0].longname : lesson.subject = "";
						element.te[0] ? lesson.teacher = element.te[0].longname : lesson.teacher = "";
						element.code ? lesson.code = element.code : lesson.code = "";
						element.lstext ? lesson.text = element.lstext : lesson.text = "";
						element.substText ? lesson.substText = element.substText : lesson.substText = "";

						let homeworkForDate = homeworkMap.get(dueDate);
						if (homeworkForDate != undefined) {
							let entry = homeworkForDate.get(element.su[0].name);
							lesson.homework = entry;
						}

						console.log("LESSON: \nyear: " + lesson.year + "\nmonth: " + lesson.month + "\nday: " + lesson.day + "\nsubject: " + lesson.subject +
							"\nteacher: " + lesson.teacher + "\ncode: " + lesson.code + "\nhomework: " + lesson.homework);
						lessons.push(lesson);
					});
				}

				this.sendSocketNotification("GOT_DATA", { title: studentData.title, lessons: lessons });
			})
			.catch(error => {
				console.log("ERROR for " + studentData.title + ": " + error.toString());
				/*
				let today = new Date();
				let errorObject = [ {
					year: today.getFullYear(),
					month: today.getMonth()+1,
					day: today.getDate(),
					hour: today.getHours(),
					minutes: today.getMinutes(),
					subject: "ERROR",
					teacher: error.toString(),
					code: "error"
				} ];
				this.sendSocketNotification("GOT_DATA", {title: studentData.title, lessons: errorObject});
				*/
			});

		untis.logout();
	},
})
