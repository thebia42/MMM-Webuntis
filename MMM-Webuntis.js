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
			var days = new Map();

			lessons.forEach(l => {
				maxNumberOfLessons = l.lessonNumber > maxNumberOfLessons ? l.lessonNumber : maxNumberOfLessons;
			});

			lessons.forEach(l => {
				let day = new Date(l.year, l.month - 1, l.day);
				let dayLong = day.toLocaleDateString("de-DE", { weekday: "long" });
				if (!days.get(dayLong)) {
					//console.log("ADD DAY: " + dayLong);
					let daysLessons = [];
					daysLessons[l.lessonNumber] = [];
					daysLessons[l.lessonNumber].push(l);
					days.set(dayLong, daysLessons);
				} else {
					if (!days.get(dayLong)[l.lessonNumber]) {
						days.get(dayLong)[l.lessonNumber] = [];
					}
					days.get(dayLong)[l.lessonNumber].push(l);
				}
			});

			var headerRow = document.createElement("tr");
			table.appendChild(headerRow);

			var headerCorner = document.createElement("th");
			headerCorner.innerHTML = studentTitle;
			headerRow.appendChild(headerCorner);

			for (const [key, value] of days.entries()) {
				var header = document.createElement("th");
				header.innerHTML = key;
				headerRow.appendChild(header);
			}

			for (let i = 1; i <= maxNumberOfLessons; i++) {
				var row = document.createElement("tr");
				let dateTimeCellCreated = false;
				for (const [key, value] of days.entries()) {
					var lessons = value[i];
					if (lessons != undefined) {

						var lesson = lessons[0];

						var time = new Date(lesson.year, lesson.month - 1, lesson.day, lesson.hour, lesson.minutes);
						var passed = time < new Date() && lesson.code != "error";
						if (!dateTimeCellCreated) {
							// date and time
							var dateTimeCell = document.createElement("td");
							if (this.config.showStartTime || lesson.lessonNumber === undefined) { dateTimeCell.innerHTML += time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }
							else { dateTimeCell.innerHTML += lesson.lessonNumber + "."; }
							dateTimeCell.className = "leftSpace align-right alignTop";
							row.appendChild(dateTimeCell);
							dateTimeCellCreated = true;
						}

						// subject cell
						var subjectCell = document.createElement("td");
						lessons.forEach(l => {
							subjectCell.innerHTML +=
								this.capitalize(l.subject) + "&nbsp;(" +
								this.capitalize(l.teacher) + ")";
								var hw = document.createElement("p");
								hw.className += " homework";
							if (l.homework) {
								hw.innerHTML += l.homework;
							}
							subjectCell.appendChild(hw);
							subjectCell.className = "leftSpace align-left alignTop";
							if (l.code == "cancelled") { subjectCell.className += " cancelled"; }
							if (l.code == "error") { subjectCell.className += " error"; }
							if (passed) { subjectCell.className += " passed"; }
						});
						row.appendChild(subjectCell);
					} else {
						// empty cell
					}
				};
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
