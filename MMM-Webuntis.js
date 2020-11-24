Module.register("MMM-Webuntis", {

	defaults: {
		students: [
			{
				title: "SET CONFIG!",
				school: "",
				username: "",
				password: "",
				server: ""
			},
		],
		days: 7,
		fetchInterval: 5 * 60 * 1000,
		showStartTime: false
	},

	getStyles: function () {
		return ["MMM-Webuntis.css"];
	},

	getTranslations: function () {
		return {
			en: "translations/en.json",
			de: "translations/de.json"
		};
	},

	start: function () {
		this.lessonsByStudent = [];
		this.sendSocketNotification("FETCH_DATA", this.config);
	},

	getDom: function () {
		var wrapper = document.createElement("div");

		var table = document.createElement("table");
		table.className = "bright small light";

		// no student
		if (this.lessonsByStudent === undefined) {
			return table;
		}

		var addedRows = 0;

		for (let studentTitle in this.lessonsByStudent) {
			var lessons = this.lessonsByStudent[studentTitle];

			lessons.sort((a, b) => a.lessonSortAlt - b.lessonSortAlt);

			let maxNumberOfLessons = 0;

			var days = [];
			for (let i = 0; i <= 6; i++) {
				days[i] = [];
				for (let j = 1; j <= maxNumberOfLessons; j++) {
					days[i][j] = [];
				}
			}

			lessons.forEach(l => {
				maxNumberOfLessons = l.lessonNumber > maxNumberOfLessons ? l.lessonNumber : maxNumberOfLessons;
			});

			lessons.forEach(l => {
				let day = new Date(l.year, l.month - 1, l.day);
				let dayLong = day.toLocaleDateString("de-DE", { weekday: "long" });
				if (!days[day.getDay()][l.lessonNumber]) {
					days[day.getDay()][l.lessonNumber] = [];
				}
				days[day.getDay()][l.lessonNumber].push(l);
				// if (!days.get(dayLong)) {
				// 	let daysLessons = [];
				// 	daysLessons[l.lessonNumber] = [];
				// 	daysLessons[l.lessonNumber].push(l);
				// 	days.set(dayLong, daysLessons);
				// } else {
				// 	if (!days.get(dayLong)[l.lessonNumber]) {
				// 		days.get(dayLong)[l.lessonNumber] = [];
				// 	}
				// 	days.get(dayLong)[l.lessonNumber].push(l);
				// }
			});

			var headerRow = document.createElement("tr");
			table.appendChild(headerRow);

			var headerCorner = document.createElement("th");
			headerCorner.innerHTML = studentTitle;
			headerRow.appendChild(headerCorner);

			// create day headers starting with today
			let today = new Date().getDay();
			for (let i = today; i <= 6; i++) {
				this.createDayHeader(days, i, headerRow);
			}
			for (let i = 0; i < today; i++) {
				this.createDayHeader(days, i, headerRow);
			}

			// for (const [key, value] of days.entries()) {
			// 	var header = document.createElement("th");
			// 	header.innerHTML = key;
			// 	headerRow.appendChild(header);
			// }

			for (let i = 1; i <= maxNumberOfLessons; i++) {
				let dateTimeCellCreated = false;

				for (let j = today; j <= 6; j++) {
					let lessons = days[j][i];
					if (lessons != undefined) {
						var row = document.createElement("tr");
						var lesson = lessons[0];
						var time = new Date(lesson.year, lesson.month - 1, lesson.day, lesson.hour, lesson.minutes);
						this.createDateTimeCell(time, row, lesson);
						dateTimeCellCreated = true;
						break;
					}
				}
				if (!dateTimeCellCreated) {
					for (let j = 0; j < today; j++) {
						let lessons = days[j][i];
						if (lessons != undefined) {
							var row = document.createElement("tr");
							var lesson = lessons[0];
							var time = new Date(lesson.year, lesson.month - 1, lesson.day, lesson.hour, lesson.minutes);
							this.createDateTimeCell(time, row, lesson);
							dateTimeCellCreated = true;
							break;
						}
					}
				}
				if (!dateTimeCellCreated) {
					//  no lessons here 
					continue;
				}

				// create lessons
				for (let j = today; j <= 6; j++) {
					let lessons = days[j][i];
					if (lessons != undefined) {
						this.createSubjectCell(lessons, row);
					} else {
						this.createDummyCell(row);
					}
				}
				for (let j = 0; j < today; j++) {
					let lessons = days[j][i];
					if (lessons != undefined) {
						this.createSubjectCell(lessons, row);
					} else {
						this.createDummyCell(row);
					}
				}
				addedRows++;
				table.appendChild(row);
			}
		} // end for students

		// add message row if table is empty
		if (addedRows == 0) {
			var nothingRow = document.createElement("tr");
			table.appendChild(nothingRow);
			var nothingCell = document.createElement("td");
			nothingCell.innerHTML = this.translate("nothing");
			nothingRow.appendChild(nothingCell);
		}

		wrapper.appendChild(table);

		return wrapper;
	},

	createDummyCell: function (row) {
		let dummyCell = document.createElement("td");
		row.appendChild(dummyCell);
	},

	createSubjectCell: function (lessons, row) {
		let subjectCell = document.createElement("td");
		// subjectCell
		lessons.forEach(l => {
			var time = new Date(l.year, l.month - 1, l.day, l.hour, l.minutes);
			var passed = time < new Date() && l.code != "error";

			let pCell = document.createElement("p");
			subjectCell.appendChild(pCell);
			pCell.innerHTML +=
				this.capitalize(l.subject) + "&nbsp;(" +
				this.capitalize(l.teacher) + ")";
			if (l.homework) {
				let hw = document.createElement("p");
				hw.className += " homework";
				hw.innerHTML += l.homework;
				pCell.appendChild(hw);
			}
			subjectCell.className = "leftSpace align-left alignTop";
			if (l.code == "cancelled") { pCell.className += " cancelled"; }
			if (l.code == "error") { pCell.className += " error"; }
			if (passed) { pCell.className += " passed"; }
		});
		row.appendChild(subjectCell);
	},

	createDateTimeCell: function (time, row, lesson) {
		var time = new Date(lesson.year, lesson.month - 1, lesson.day, lesson.hour, lesson.minutes);
		var passed = time < new Date() && lesson.code != "error";

		var dateTimeCell = document.createElement("td");
		if (this.config.showStartTime || lesson.lessonNumber === undefined) { dateTimeCell.innerHTML += time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }
		else { dateTimeCell.innerHTML += lesson.lessonNumber + "."; }
		dateTimeCell.className = "leftSpace align-right alignTop";
		row.appendChild(dateTimeCell);
	},

	// TODO internationalization
	createDayHeader: function (days, numberOfWeekday, headerRow) {
		if (!days[numberOfWeekday].length == 0) {
			var header = document.createElement("th");
			switch (numberOfWeekday) {
				case 0:
					header.innerHTML = "Sonntag";
					break;
				case 1:
					header.innerHTML = "Montag";
					break;
				case 2:
					header.innerHTML = "Dienstag";
					break;
				case 3:
					header.innerHTML = "Mittwoch";
					break;
				case 4:
					header.innerHTML = "Donnerstag";
					break;
				case 5:
					header.innerHTML = "Freitag";
					break;
				case 6:
					header.innerHTML = "Samstag";
					break;

			}
			headerRow.appendChild(header);
		}
	},

	capitalize: function (str) {
		str = str.toLowerCase().split(" ");

		for (let i = 0, x = str.length; i < x; i++) {
			if (str[i]) {
				if (str[i] === "ii" || str[i] === "iii") { str[i] = str[i].toUpperCase(); }
				else { str[i] = str[i][0].toUpperCase() + str[i].substr(1); }
			}
		}

		return str.join(" ");
	},

	notificationReceived: function (notification, payload) {
		switch (notification) {
			case "DOM_OBJECTS_CREATED":
				var timer = setInterval(() => {
					this.sendSocketNotification("FETCH_DATA", this.config);
				}, this.config.fetchInterval);
				break;
		}
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "GOT_DATA") {
			if (payload.lessons) {
				this.lessonsByStudent[payload.title] = payload.lessons;
				this.updateDom();

			}
		}
	},
});