//========================================================================================
// Global Vars
//========================================================================================
const defaultNoticeSpeed = 250;
const touch = matchMedia("(hover: none)").matches;
const rightClick = matchMedia("(pointer: fine)").matches;
const smallBreakpoint = 768;
const mediumBreakpoint = 1312;
const params = new Proxy(new URLSearchParams(window.location.search), { get: (searchParams, prop) => searchParams.get(prop)});
// const touch = true;
var $groupsContainer; // .groups element
var $groups;
var $settings; // .settings element
var $preferences = $(".preferences-form"); // .preferences element. Stored after tippy has been mounted
var $notices = $("#notices"); // #notices element
var optionGroups = []; // array of jQuery elements keyed by type
var pickGroups = []; // array of jQuery elements keyed by type


//========================================================================================
// Main Event Triggers
//========================================================================================

/* Run init() on page load
==========================================================*/
document.addEventListener("DOMContentLoaded", function() { init(); }, false);

/* Confirm on exit if items are picked
==========================================================*/
window.addEventListener("beforeunload", function (e) {
	if ($groups.filter(".picks").find(".item").length) {
		var confirmationMessage = 'It looks like you have been editing something. '
								+ 'If you leave before saving, your changes will be lost.';

		(e || window.event).returnValue = confirmationMessage; //Gecko + IE
		return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
	}
});


//========================================================================================
// Init
//========================================================================================
/**
 * Init
 */
function init() {

	/* Dom Element Vars
	==========================================================*/
	$groupsContainer = $(".groups");
	$settings = $(".settings");
	$groups = $(".group");

	/* Misc Setup
	==========================================================*/
	// Set Touch Class
	$("body").addClass((touch ? "touch" : "no-touch"));

	// Set Default Settings
	setBuildSetting("types", "w", true);
	setBuildSetting("types", "g", true);
	setBuildSetting("types", "r", true);
	setBuildSetting("types", "y", true);
	setBuildSetting("types", "b", true);
	setBuildSetting("types", "p", true);
	setBuildSetting("types", "o", true);

	setBuildSetting("dlc", "vanilla", true);
	setBuildSetting("dlc", "sotv", true);
	setBuildSetting("dlc", "sots", true);
	setBuildSetting("dlc", "ac", true);

	/* Events
	==========================================================*/
	$(document.body)
		// Left Click Options Item
		.on("click", ".group.options .item", function(e) {
			var $item = $(this);
			var type = $item.parents(".group").attr("data-type");
			var id = $item.attr("data-item-id");
			$toGroup = pickGroups[type];

			if ($toGroup.find(".item:last").is("[data-item-id='" + id + "']")) {
				incrementItem($toGroup.find(".item:last"));
			} else {
				$newItem = $item.clone().appendTo($toGroup.find(".items"));
				initItem($newItem);
			}
		})

		// Left Click Picks Item
		.on("click", ".group.picks .item", function(e) {
			var $item = $(this);
			incrementItem($item);
		})

		// Right Click Picks Item
		.on("contextmenu", ".group.picks .item", function(e) {
			e.preventDefault();
			decrementItem($(this));
		})

		// Right Click Picks Container
		.on("contextmenu", ".group.picks", function(e) {
			e.preventDefault();
		})

		// Settings Types
		.on("change", ".settings input[type='checkbox']", function(e) {
			updateInterface();
		})

		// Settings Groups Per Row
		.on("keyup change click input paste propertychange", ".pref-groups-per-row", function(e) {
			updateInterface();
		})

		// Settings Load Build
		.on("click", ".load-form button.load", function(e) {
			var loadName = $settings.find("select[name='settings-load-id']").val();
			var build = getBuildByID(loadName);
			loadBuild(build);
			maybeCloseTippy(e.target);
			showNotice("Build loaded", "success");
		})

		// Settings Delete Build
		.on("click", ".load-form button.delete", function(e) {
			var $select = $settings.find("select[name='settings-load-id']");
			var id = $select.val();
			var name = $select.find("option:selected").html();

			if (window.confirm("Delete build '" + name + "'?"))
				deleteBuildByID(id);

			maybeCloseTippy(e.target);
		})

		// Settings Save Build
		.on("click", ".settings .save button", function(e) {
			var result = saveBuild();
			if (result)
				showNotice("Build " + (result === 1 ? "saved" : "updated"), "success");
		})

		// Settings Import Form
		.on("click", ".import-form button", function(e) {
			var $input = $(".import-input");
			var json = $input.val();

			try {
				loadBuild(JSON.parse(json));
				$input.val("");
				maybeCloseTippy(e.target);
				showNotice("Build imported", "success");
			} catch (e) {
				alert('Invalid import string:\n' + e);
				return;
			}

			return false;
		})

		// Settings Export/Share Form Input Click
		.on("click", ".export-output, .share-output", function(e) {
			$(this).select();
		})

		// Settings Export/Share Form Copy
		.on("click", ".export-form button.copy, .share-form button.copy", function(e) {
			var target = $(this).parent().find(".copy-source").get(0);

			// Select the text field
			target.select();
			target.setSelectionRange(0, 99999); // For mobile devices

			// Copy the text inside the text field
			navigator.clipboard.writeText(target.value);

			// show notice
			showNotice("Copied to clipboard", "success");
		})

		// Settings Reset Build
		.on("click", ".settings .reset button", function(e) {
			if (window.confirm("Really reset?")) {
				$groups.filter(".picks").find(".item").remove();
				$settings.find("input[name='settings-name']").val("");
			}
		})

		// Settings Name
		.on("blur", ".settings input[name='settings-name']", function(e) {
			var value = e.target.value.trim();
			document.title = (value ? value + " | " : "") + siteTitle;
		})

		// Search Input
		.on("keyup change click input paste propertychange", "input[name='s']", function(e) {
			updateInterface();
		})

		// Search Clear
		.on("click", ".search .clear", function(e) {
			$("input[name='s']").val("").focus();
			updateInterface();
		});

	$(window).on("resize", function() {
		updateInterface();
	});

	/* Setup + Create Itmes
	==========================================================*/
	var type;
	var items;
	var itemData;
	var $item;
	var $group;
	var ignoreItem;

	for (var i = 0; i < types.length; i++) {
		type = types[i];
		items = db[type];
		$group = $groups.filter(".options.type-" + type);
		optionGroups[type] = $group;
		pickGroups[type] = $groups.filter(".picks.type-" + type);

		for (var x = 0; x < items.length; x++) {
			itemData = items[x];
			ignoreItem = false;

			// filter the database items
			if (itemData.id.search(/item_scrap/i) >= 0)
				ignoreItem = true;

			if (!ignoreItem) {
				$item = $(createItemHTML(itemData, type));
				$group.find(".items").append($item);
				initItem($item);
			}
		}
	}

	/* Interface
	==========================================================*/
	/* Trigger Update
	------------------------------------------------*/
	updateInterface();
	// trigger again on delay to fix browser prefilling form fields when duplicating/refreshing
	setTimeout(updateInterface, 500);

	/* Init Tooltips
	------------------------------------------------*/
	// General Tooltips w/ Data Attribute
	tippy("[data-tippy-content]", {
		arrow: tippy.roundArrow,
		theme: "scuzz-inline",
		maxWidth: 350,
		duration: [100, 50],
	});

	// General Tooltips w/ HTML
	tippy("[data-tippy-html]", {
		content(reference) {
			const id = reference.getAttribute('data-tippy-html');
			const template = document.getElementById(id);
			const templateHTML = template.innerHTML;
			template.remove();
			return templateHTML;
		},
		arrow: tippy.roundArrow,
		theme: "scuzz",
		allowHTML: true,
		interactive: true,
		maxWidth: 350,
		duration: [100, 50],
	});

	// Preferences Tooltip
	tippy(".preferences", {
		content(reference) {
			const template = document.getElementById("preferences");
			const templateHTML = template.innerHTML;
			template.remove();
			return templateHTML;
		},
		arrow: tippy.roundArrow,
		theme: "scuzz-settings",
		allowHTML: true,
		interactive: true,
		trigger: "click",
		maxWidth: 350,
		duration: [100, 50],
		onMount: function(instance) {
			$preferences = $(".preferences-form");
		},
	});

	// Load
	tippy($settings.find(".load button").get(0), {
		content: '<div class="load-form tooltip-form"><select type="text" name="settings-load-id"></select><button class="button load">Load</button><button class="button delete">Delete</button></div>',
		trigger: "click",
		placement: "bottom",
		arrow: tippy.roundArrow,
		interactive: true,
		allowHTML: true,
		theme: "scuzz-settings",
		maxWidth: 350,
		duration: [100, 50],
		onShow: function(instance) {
			var $select = $(instance.popper).find("select[name='settings-load-id']");
			$select.find("option").remove();
			var builds = getBuilds();
			// sort builds by name
			builds.sort(function(a, b) {
				var aName = a.settings.name.toLowerCase();
				var bName = b.settings.name.toLowerCase();
				if (aName < bName) { return -1; }
				if (aName > bName) { return 1; }
				return 0;
			});
			for (var i = 0; i < builds.length; i++) {
				$select.append('<option value="' + builds[i].id + '">' + builds[i].settings.name + '</option>');
			}
		},
	});

	// Import
	tippy($settings.find(".import button").get(0), {
		content: '<div class="import-form tooltip-form horz"><input type="text" class="import-input"><button class="button import">Import</button></div>',
		trigger: "click",
		placement: "bottom",
		arrow: tippy.roundArrow,
		interactive: true,
		allowHTML: true,
		theme: "scuzz-settings",
		maxWidth: 500,
		duration: [100, 50],
		onShow: function(instance) {
			// slight delay needed
			setTimeout(function() {
				$(instance.popper).find("input.import-input").focus();
			}, 25);
		},
	});

	// Export
	tippy($settings.find(".export button").get(0), {
		content: '<div class="export-form tooltip-form horz"><input type="text" class="export-output copy-source"><button class="button copy"><span class="fa-solid fa-copy"></span></button></div>',
		trigger: "click",
		placement: "bottom",
		arrow: tippy.roundArrow,
		interactive: true,
		allowHTML: true,
		theme: "scuzz-settings",
		maxWidth: 500,
		duration: [100, 50],
		onShow: function(instance) {
			var $tippy = $(instance.popper);
			$tippy.find(".export-output").val(JSON.stringify(getCurrentBuild()));
		},
	});

	// Share
	tippy($settings.find(".share button").get(0), {
		content: '<div class="share-form tooltip-form horz"><input type="text" class="share-output copy-source"><button class="button copy"><span class="fa-solid fa-copy"></span></button></div>',
		trigger: "click",
		placement: "bottom",
		arrow: tippy.roundArrow,
		interactive: true,
		allowHTML: true,
		theme: "scuzz-settings",
		maxWidth: 500,
		duration: [100, 50],
		onShow: function(instance) {
			var $tippy = $(instance.popper);
			var build = getCurrentBuild();
			var newBuildStr = '';
			for (const type in build.items) {
				var items = build.items[type];

				if (items.length) {
					var newItems = [];
					for (var i = 0; i < items.length; i++) {
						newItems.push(intToChar(getItemIndex(items[i].id)) + items[i].qty);
					}

					if (newBuildStr)
						newBuildStr += '|';

					newBuildStr += type + ':' + newItems.join('');
				}
			}

			var shareURL = new URL(window.location.href);
			shareURL.searchParams.set("build", newBuildStr);
			$tippy.find(".share-output").val(shareURL.href);
		},
	});

	// Gesture of the Drowned Tooltip
	tippy(".gotd", {
		content(reference) {
			const template = document.getElementById("gotd");
			const templateHTML = template.innerHTML;
			template.remove();
			return templateHTML;
		},
		placement: 'bottom',
		arrow: tippy.roundArrow,
		theme: "scuzz-settings",
		allowHTML: true,
		interactive: true,
		trigger: "click",
		maxWidth: 600,
		duration: [100, 50],
		onCreate: function(instance) {
			const cooldowns = [15, 20, 30, 45, 60, 100, 140];
			var $gotdForm = $(instance.popper).find(".gotd-form");

			/* Setup DOM
			------------------------------------------------*/
			var $table = $('<table><thead><tr></tr></thead><tbody></tbody></table>');
			var $thead = $table.find("thead");
			var $tbody = $table.find("tbody");

			// Table Head DOM
			$thead.find("tr").append('<th>Amount</th>');
			for (var c = 0; c < cooldowns.length; c++) {
				$thead.find("tr").append('<th>' + cooldowns[c] + 's</th>');
			}

			// Table Body DOM
			var $tr;
			for (var i = 1; i <= 10; i++) {
				$tr = $('<tr />');
				$tr.append('<td>' + i + '</td>');

				for (var c = 0; c < cooldowns.length; c++) {
					$tr.append('<td>' + calcGotDCooldown(cooldowns[c], i).toFixed(1) + '</td>');
				}

				$tr.appendTo($tbody);
			}

			// Table Custom DOM
			$tr = $('<tr class="custom" />');
			$tr.append('<td><input type="number" class="gotd-custom" step="1" min="0"></td>');
			for (var c = 0; c < cooldowns.length; c++) {
				$tr.append('<td></td>');
			}
			$tr.appendTo($tbody);

			// Append Table to Form
			$gotdForm.append($table);

			/* Input Change Event
			------------------------------------------------*/
			$(document).on("keyup change click input paste propertychange", ".gotd-form input.gotd-custom", function() {
				var gotdCount = parseInt($(this).val());
				var $tr = $gotdForm.find("tr.custom");

				for (var i = 0; i < cooldowns.length; i++) {
					var result = (gotdCount >= 1) ? (cooldowns[i] * 0.5 * Math.pow((1 - 0.15), gotdCount - 1)).toFixed(1) : '';
					$tr.find("td").eq(i + 1).html(result);
				}
			});
		},
	});

	/* Init Sortables
	------------------------------------------------*/
	for (var i = 0; i < types.length; i++) {
		type = types[i];
		items = db[type];

		// Options Items
		Sortable.create(optionGroups[type].find(".items").get(0), {
			group: {
				name: "option-" + type,
				pull: "clone",
			},
			sort: false,
			touchStartThreshold: 3,
			fallbackTolerance: 3,
			animation: 0,
			onStart: startItemMergeValidation,
			onEnd: endItemMergeValidation,
		});

		// Delete Dropzone
		if (touch) {
			Sortable.create(optionGroups[type].find(".delete-dropzone").get(0), {
				group: {
					put: "pick-" + type,
				},
				sort: false,
				swapThreshold: 0.1,
				onAdd: function(evt) {
					var $item = $(evt.item);
					evt.item._tippy.hide();
					$item.remove();
					var $originalItem = $(evt.clone);
					$item.remove();
					$originalItem.remove();
				}
			});
		}

		// Picks Items
		Sortable.create(pickGroups[type].find(".items").get(0), {
			group: {
				name: "pick-" + type,
				put: "option-" + type,
				pull: "clone",
			},
			animation: 100,
			easing: "cubic-bezier(0.45, 0, 0.55, 1)",
			touchStartThreshold: 3,
			fallbackTolerance: 3,
			swapThreshold: 0.1,
			onStart: startItemMergeValidation,
			onEnd: endItemMergeValidation,
			onAdd: function(evt) {
				var item = evt.item;
				var $item = $(item);
				initItem($item);
			},
		});
	}

	/* Load Build from Query Arg
	------------------------------------------------*/
	if (params.build) {
		var build = stringToBuild(params.build);
		loadBuild(build);
		showNotice("Build loaded", "success");
	}

}


//========================================================================================
// Database Functions
//========================================================================================
/**
 * GetItemByID
 *
 * @param string id		Build ID.
 *
 * @return object Item object.
 */
function getItemByID(id) {
	var item;
	for (var i = 0; i < types.length; i++) {
		for (var x = 0; x < db[types[i]].length; x++) {
			item = db[types[i]][x];
			if (item.id == id)
				return item;
		}
	}
	return false;
}

/**
 * Get Item Type.
 *
 * @param string id
 *
 * @return object Item object.
 */
function getItemType(id) {
	var item;
	for (var i = 0; i < types.length; i++) {
		for (var x = 0; x < db[types[i]].length; x++) {
			item = db[types[i]][x];
			if (item.id == id)
				return types[i];
		}
	}
	return false;
}

/**
 * Get Item Index.
 * Gets the index of the item within the database.
 *
 * @param string id
 *
 * @return int Index of array.
 */
function getItemIndex(id) {
	var item;
	for (var i = 0; i < types.length; i++) {
		for (var x = 0; x < db[types[i]].length; x++) {
			item = db[types[i]][x];
			if (item.id == id)
				return x;
		}
	}
	return false;
}

/**
 * Search Items.
 *
 * @param string s 	Search string.
 *
 * @return array	Array of item IDs. Empty string if no results found.
 */
function searchItems(s) {
	var results = [];
	var item;
	var isMatch;
	var regex;

	for (var i = 0; i < types.length; i++) {
		for (var x = 0; x < db[types[i]].length; x++) {
			item = db[types[i]][x];
			isMatch = false;
			regex = new RegExp(s, "i");
			if (item.title.search(regex) >= 0 || item.desc.replace(/<([^>]+?)>(.+?)<\/[^>]+?>/gi, '$2').search(regex) >= 0)
				isMatch = true;

			if (isMatch)
				results.push(item.id);
		}
	}

	return results;
}


//========================================================================================
// Item Functions
//========================================================================================
/**
 * CreateItemHTML
 *
 * @param object item	Item object.
 * @param string type	Optional. Item type. Will be looked up in the db if not provided.
 * @param int qty		Optional. Item quantity. Defaults to 1.
 *
 * @return string		HTML as string.
 */
function createItemHTML(item, type, qty) {
	type = (type) ? type : getItemType(item.id);
	qty = (parseInt(qty) > 0) ? qty : 1;
	var html = '';

	html += '<div class="item" data-item-id="' + item.id + '" data-item-type="' + type + '" data-item-qty="' + qty + '" data-item-dlc="' + (item.dlc ? item.dlc.toLowerCase() : '') + '">';
		html += '<div class="item-wrapper">';
			html += '<div class="icon">';
				html += '<img src="' + item.icon + '" alt="' + item.title + '">';
			html += '</div>';
			html += '<div class="ui">';
				if (item.dlc)
					html += '<div class="dlc ' + item.dlc.toLowerCase() + '"></div>'
			html += '</div>';
		html += '</div>';
		html += '<div class="dropzone"></div>';
	html += '</div>';

	return html;
}

/**
 * Init Item.
 *
 * @param $object $item		jQuery object of the $item.
 */
function initItem($item) {
	var type = $item.attr("data-item-type");
	var item = $item.get(0);

	/* Tooltips
	------------------------------------------------*/
	// Item Description
	tippy(item, {
		content: (reference) => createItemInfoHTML(reference.getAttribute("data-item-id")),
		allowHTML: true,
		arrow: tippy.roundArrow,
		placement: (touch) ? "top" : "bottom",
		// trigger: "click",
		theme: "scuzz",
		maxWidth: 250,
		animation: "fade",
		touch: ["hold", 300],
		duration: [100, 50],
		offset: [0, 10],
	});

	// Item Wiki Link
	if (!touch) {
		tippy(item, {
			content: (reference) => createItemWikiHTML(reference.getAttribute("data-item-id")),
			arrow: tippy.roundArrow,
			allowHTML: true,
			placement: "right",
			// trigger: "click",
			theme: "scuzz-info",
			animation: "fade",
			duration: [100, 0],
			delay: [750, 0],
			interactive: true,
			offset: [0, 0],
		});
	}

	/* Sortables
	------------------------------------------------*/
	// Sortable for Picks Only
	if ($item.parents(".group").is(".picks")) {
		Sortable.create($item.find(".dropzone").first().get(0), {
			group: {
				put: true,
				pull: ["option-" + type, "pick-" + type],
			},
			onAdd: function(evt) {
				var $item = $(evt.item);
				var $originalItem = $(evt.clone);
				var $parentItem = $item.parents(".item");

				// set the qty
				var qty = parseInt($item.attr("data-item-qty")) + parseInt($parentItem.attr("data-item-qty"));
				$parentItem.attr("data-item-qty", qty);

				// remove dom elements
				if ($originalItem.parents(".group").is(".picks"))
					$originalItem.remove();
				$item.remove();
			}
		});
	}
}

/**
 * CreateItemInfoHTML
 *
 * @param object|string itemOrID	Item object or item ID.
 *
 * @return string					HTML as string.
 */
function createItemInfoHTML(itemOrID) {
	var item;
	var html = '';

	if (typeof itemOrID === "string")
		item = getItemByID(itemOrID);
	else if (typeof itemOrID === "object")
		item = itemOrID;

	if (item) {
		var title = item.title;
		var desc = item.desc;
		var stackType = item.stackType;
		var cooldown = item.cooldown;
		var dlc = item.dlc;

		// convert tags to span elements with classes
		desc = desc.replace(/<(blue|yellow|green|red|gray|purple)>/gi, '<span class="$1">');
		desc = desc.replace(/<\/(blue|yellow|green|red|gray|purple)>/gi, '</span>');

		html += '<h5 class="item-title">' + title + '</h5>';
		html += '<div class="item-desc">' + desc + '</div>';
		if (stackType)
			html += '<div class="item-meta item-stack-type"><label>Stack Type</label> ' + stackType + '</div>';
		if (cooldown)
			html += '<div class="item-meta item-cooldown"><label>Cooldown</label> ' + cooldown + '</div>';
		if (dlc)
			html += '<div class="item-meta item-dlc"><label>DLC</label> ' + dlc + '</div>';
	}

	return html;
}

/**
 * CreateItemWikiHTML
 *
 * @param object|string itemOrID	Item object or item ID.
 *
* @return string					HTML as string.
 */
function createItemWikiHTML(itemOrID) {
	var item;
	var html = null;

	if (typeof itemOrID === "string")
		item = getItemByID(itemOrID);
	else if (typeof itemOrID === "object")
		item = itemOrID;

	if (item) {
		html = '<a href="' + wikiURL + item.url + '" target="_blank" title="Wiki" class="url"></a>';
	}

	return html;
}

/**
 * Increment Item.
 *
 * @param $object $item		jQuery object of the $item.
 */
function incrementItem($item) {
	var qty = $item.attr("data-item-qty");
	$item.attr("data-item-qty", ++qty);
}

/**
 * Decrement Item.
 *
 * @param $object $item		jQuery object of the $item.
 */
function decrementItem($item) {
	if (!$item.length)
		return;

	var qty = parseInt($item.attr("data-item-qty"));

	if (qty > 1)
		$item.attr("data-item-qty", --qty);
	else if (!touch)
		$item.remove();
}


//========================================================================================
// Interface
//========================================================================================
/**
 * Start Item Merge Validation.
 *
 * @param object evt	Sortables plugin event object.
 */
function startItemMergeValidation(evt) {
	var $item = $(evt.item);
	var chosenItemID = $item.attr("data-item-id");
	var itemType = getItemType(chosenItemID);
	var $items = pickGroups[itemType].find(".item");
	var $invalidItems = $items.filter(":not([data-item-id='" + chosenItemID + "'])").addClass("cannot-merge");

	// disable tooltip while dragging (mostly for touch)
	evt.item._tippy.disable();

	// add class to items that can be merged
	$items.filter("[data-item-id='" + chosenItemID + "']:not(.sortable-chosen)").addClass("can-merge");

	// disable sortables for items that cannot be merged
	$invalidItems.each(function() {
		var sortable = Sortable.get($(this).find(".dropzone").get(0));
		sortable.option("disabled", true);
	});

	// enable delete dropzone for touch devices
	if (touch && $item.parents(".group").is(".picks"))
		optionGroups[itemType].find(".delete-dropzone").addClass("enabled");
}

/**
 * End Item Merge Validation.
 *
 * @param object evt	Sortables plugin event object.
 */
function endItemMergeValidation(evt) {
	// re-enable tooltip when dragging finishes (mostly for touch)
	evt.item._tippy.enable();

	// remove classes
	var $items = $groups.find(".item").removeClass("can-merge cannot-merge");

	// renable sortables
	$items.each(function() {
		var sortable = Sortable.get($(this).find(".dropzone").get(0));
		if (sortable)
			sortable.option("disabled", false);
	});

	// disable delete dropzone
	$groups.find(".delete-dropzone").removeClass("enabled");
}

/**
 * Update Interface.
 *
 * @param object build	Optional. The build object. Defaults to the current build.
 */
function updateInterface(build) {
	build = (build) ? build : getCurrentBuild();
	var settings = build.settings;
	var showTypeCount = $settings.find("input[name='settings-types']:checked").length;
	var prefGroupsPerRow = parseInt($preferences.find(".pref-groups-per-row").val());
	var autoGroupsPerRow = ($(window).width() < mediumBreakpoint) ? 4 : showTypeCount;
	var groupsPerRow = (prefGroupsPerRow > 0) ? Math.min(showTypeCount, prefGroupsPerRow) : Math.min(showTypeCount, autoGroupsPerRow);

	// force to 1 for small devices
	if (($(window).width() < smallBreakpoint))
		groupsPerRow = 1;

	// Name
	$settings.find("input[name='settings-name']").val(settings.name).trigger("blur");

	// Types
	var i = 0;
	var c = 0;
	var r = 0;
	$groupsContainer.css("--groups-show-count", showTypeCount);
	$groupsContainer.css("--groups-per-row", groupsPerRow);
	for (const key in settings.types) {
		var value = settings.types[key];

		$settings.find("input[name='settings-types'][value='" + key + "']").prop("checked", value);

		if (value) {
			if (groupsPerRow > 1) {
				c = (i % groupsPerRow) + 1;
				r = (Math.floor(i / groupsPerRow) * 2) + 1;
				$groupsContainer.addClass("show-" + key).removeClass("hide-" + key);
				$groups.filter(".options.type-" + key).css("grid-row", r).css("grid-column", c);
				$groups.filter(".picks.type-" + key).css("grid-row", r + 1).css("grid-column", c);
			} else {
				r = i + 1;
				$groups.filter(".options.type-" + key).css("grid-row", r).css("grid-column", 1);
				$groups.filter(".picks.type-" + key).css("grid-row", r).css("grid-column", 2);
			}

			i++;
		} else {
			$groupsContainer.addClass("hide-" + key).removeClass("show-" + key);
		}
	}

	// DLC
	for (const key in settings.dlc) {
		var value = settings.dlc[key];

		if (value)
			$groupsContainer.addClass("show-dlc-" + key).removeClass("hide-dlc-" + key);
		else
			$groupsContainer.addClass("hide-dlc-" + key).removeClass("show-dlc-" + key);
	}

	// Search
	var s = $("input[name='s']").val().trim();
	if (s) {
		$groupsContainer.addClass("is-searching");
		var searchResults = searchItems(s);
		$groups.find(".item").removeClass("is-search-result");
		for (var i = 0; i < searchResults.length; i++) {
			$groups.find(".item[data-item-id='" + searchResults[i] + "']").addClass("is-search-result");
		}
	} else {
		$groupsContainer.removeClass("is-searching");
		$groups.find(".item").removeClass("is-search-result");
	}
}

/**
 * Maybe Close Tippy.
 * Closes a tooltip related to the target element.
 *
 * @param object target		HTML dom element object.
 * @param object checkSelf	Optional. Set to true to close the tippy attached to the target. Defaults to false.
 */
function maybeCloseTippy(target, checkSelf) {
	// Maybe close tippy self
	if (checkSelf === true && target._tippy)
		target._tippy.hide();

	// Maybe close tippy parent
	var $tippyParent = $(target).parents("[data-tippy-root]");
	if ($tippyParent.length) {
		var tippyInstance = $(target).parents("[data-tippy-root]").get(0)._tippy;
		if (tippyInstance)
			tippyInstance.hide();
	}
}

/**
 * Show Notice.
 *
 * @param string content				Text/HTML to display.
 * @param string|object typeOrOptions	Optional. Type of notice or object of options. Defaults to success.
 */
function showNotice(content, typeOrOptions) {
	var options;
	var defaults = {
		duration : 3000,
		speed : defaultNoticeSpeed,
		type : "success",
	};

	if (typeof typeOrOptions === "object") {
		options = $.extend(defaults, typeOrOptions);
	} else if (typeof typeOrOptions === "string") {
		options = $.extend(defaults, { type : typeOrOptions });
	} else {
		options = defaults;
	}

	var microDelay = 15;
	var $html = $('<div class="notice-container"><div class="notice" data-notice-type="' + options.type + '">' + content + '</div></div>');

	// Show
	$html.css({
		"--animation-speed" : (options.speed / 1000) + "s",
	});
	$notices.append($html);

	setTimeout(function() {
		$html.addClass("opening");

		setTimeout(function() {
			$html.addClass("open").removeClass("opening");

			setTimeout(function() {
				$html.addClass("leaving").removeClass("open");

				setTimeout(function() {
					$html.remove();
				}, options.speed);
			}, options.duration);
		}, options.speed);
	}, microDelay);
}


//========================================================================================
// Build Data
//========================================================================================
/**
 * Load Build.
 *
 * @param object build	Optional. The build object. Defaults to the current build.
 */
function loadBuild(build) {
	if (!build)
		return;

	$groups.filter(".picks").find(".item").remove();
	var $target;
	var $item;

	for (var i = 0; i < types.length; i++) {
		type = types[i];
		items = build.items[type];
		$target = pickGroups[type].find(".items");

		if (items && items.length) {
			// Append items to user's picks
			for (var x = 0; x < items.length; x++) {
				$item = $(createItemHTML(getItemByID(items[x].id), type, items[x].qty));
				$target.append($item);
				initItem($item);
			}
		}

		// Show/Hide Type
		if (build.settings.types[type] === undefined)
			build.settings.types[type] = false;
		setBuildSetting("types", type, build.settings.types[type]);
	}

	// Restore DLC options, defaulting new options on for older builds
	build.settings.dlc = build.settings.dlc || {};
	$settings.find("input[name='settings-dlc']").each(function() {
		var dlc = $(this).val();
		if (build.settings.dlc[dlc] === undefined)
			build.settings.dlc[dlc] = true;
		setBuildSetting("dlc", dlc, build.settings.dlc[dlc]);
	});

	// Update Groups Per Row
	$preferences.find(".pref-groups-per-row").val(build.settings.groupsPerRow);

	updateInterface(build);
}

/**
 * Get build.
 *
 * @return object	Build object.
 */
function getCurrentBuild() {
	var build = {
		id : null,
		items : {},
		settings : {
			name : "",
			types : {},
			dlc : {},
			groupsPerRow : null,
		},
	};

	/* Items
	------------------------------------------------*/
	for (var i = 0; i < types.length; i++) {
		type = types[i];
		build.items[type] = [];

		pickGroups[type].find(".item").each(function() {
			build.items[type].push({
				id: $(this).attr("data-item-id"),
				qty: parseInt($(this).attr("data-item-qty")),
			});
		});
	}

	/* Settings
	------------------------------------------------*/
	// Name
	build.settings.name = $settings.find("input[name='settings-name']").val();

	// Types
	$settings.find("input[name='settings-types']").each(function() {
		build.settings.types[$(this).val()] = $(this).is(":checked");
	});

	// DLC
	$settings.find("input[name='settings-dlc']").each(function() {
		build.settings.dlc[$(this).val()] = $(this).is(":checked");
	});

	// Groups Per Row
	build.settings.groupsPerRow = $preferences.find(".pref-groups-per-row").val();

	/* ID
	------------------------------------------------*/
	var id = getBuildByName(build.settings.name, "id");
	if (id)
		build.id = id;

	return build;
}

/**
 * Set Build Setting.
 *
 * @param string setting	Name of setting to change.
 * @param mixed keyOrValue	Value to change or the key of the sub-setting to change.
 * @param mixed orValue		Optional. Value to change if modifying a sub-setting.
 */
function setBuildSetting(setting, keyOrValue, orValue) {
	var key = (orValue !== undefined) ? keyOrValue : null;
	var value = (orValue !== undefined) ? orValue : keyOrValue;

	switch(setting) {
		// Checkboxes
		case "types":
		case "dlc":
			$settings.find("input[name='settings-" + setting + "'][value='" + key + "']").prop("checked", value);
			break;

		// Text
		default:
			$settings.find("input[name='settings-" + setting + "']").val(value);
	}
}

/**
 * Get Saved Builds.
 *
 * @return array	Array of Build objects.
 */
function getBuilds() {
	var builds = [];
	var data = localStorage.getItem("builds");

	if (data) {
		try {
			builds = JSON.parse(data);
		} catch (e) {
			alert('Failed to load build:\n' + e);
			return;
		}
    }

	return builds;
}

/**
 * Get Build by ID.
 *
 * @param string id				Build ID.
 * @param string returnType		Optional. Data to return. <index|name>.
 *
 * @return mixed				Build object by default. Integer or string depending on return type.
 */
function getBuildByID(id, returnType) {
	var builds = getBuilds();
	var build;

	for (var i = 0; i < builds.length; i++) {
		build = builds[i];
		if (build.id === id) {
			if (returnType === "index")
				return i;
			else if (returnType === "name")
				return build.settings.name;
			else
				return build;

		}
	}

	return false;
}

/**
 * Get Build By Name.
 *
 * @param string name			Build name.
 * @param string returnType		Optional. Data to return. <index|name>.
 *
 * @return mixed				Build object by default. Integer or string depending on return type.
 */
function getBuildByName(name, returnType) {
	var builds = getBuilds();
	var build;

	for (var i = 0; i < builds.length; i++) {
		build = builds[i];
		if (build.settings.name === name) {
			if (returnType === "index")
				return i;
			else if (returnType === "id")
				return build.id;
			else
				return build;
		}
	}

	return false;
}

/**
 * Save Build.
 *
 * @return int|false 	Returns 1 for new builds, 2 for updated builds, false if none saved/error.
 */
function saveBuild() {
	var build = getCurrentBuild();
	if (!build.settings.name)
		build.settings.name = "Untitled Build";
	var buildID = getBuildByName(build.settings.name, "id");
	var buildIndex = getBuildByID(buildID, "index");
	var builds = getBuilds();
	var result = false;

	// Make sure build ID is set
	build.id = (buildID) ? buildID : guid();

	if (buildIndex !== false && buildIndex >= 0) {
		// Confirm before replacing
		if (window.confirm("Overwrite build '" + build.settings.name + "'?")) {
			builds[buildIndex] = build;
			result = 2;
		}
	} else {
		builds.push(build);
		result = 1;
	}

	localStorage.setItem("builds", JSON.stringify(builds));

	return result;
}

/**
 * DeleteBuildByID
 *
 * @param string id		Build ID.
 */
function deleteBuildByID(id) {
	var builds = getBuilds();
	var buildIndex = getBuildByID(id, "index");

	if (buildIndex !== false) {
		builds.splice(buildIndex, 1);
	}

	localStorage.setItem("builds", JSON.stringify(builds));
}

/**
 * String to Build.
 */
function stringToBuild(str) {
	var groups = str.match(/[a-z]:[^\|]+/gi);
	var build = {
		id : null,
		items : {},
		settings : getCurrentBuild().settings, // get current build settings as defaults
	};

	// set types to match defaults
	build.settings.types = {
		w : true,
		g : true,
		r : true,
		y : true,
		b : true,
		p : false,
		o : true,
		m : false,
		l : false,
	};

	// run once to apply hidden types
	updateInterface(build);

	for (var g = 0; g < groups.length; g++) {
		var group = groups[g];
		var type = group.substring(0, 1);
		var items = group.substring(2).match(/[a-z]+\d+/gi);

		for (var i = 0; i < items.length; i++) {
			if (!build.items[type])
				build.items[type] = [];

			build.items[type].push({
				id : db[type][charToInt(items[i].match(/[a-z]+/)[0])].id,
				qty : parseInt(items[i].match(/\d+/)),
			});
		}

		// show type
		build.settings.types[type] = true;
	}

	return build;
}


//========================================================================================
// Helper Functions
//========================================================================================
/**
 * Guid
 *
 * @return string	Unique GUID string.
 */
function guid() {
	let a = new Uint32Array(3);
	window.crypto.getRandomValues(a);
	return (performance.now().toString(36)+Array.from(a).map(A => A.toString(36)).join("")).replace(/\./g,"");
};

/**
 * Log
 *
 * @param mixed value	Value to display to the console log.
 */
function log(value) {
	console.log(value);
}

/**
 * Integer to Character.
 * Converts an integer to a character(s). If integer is higher than 25 (z) then multiple chars will be returned.
 */
function intToChar(int) {
	const code = 'a'.charCodeAt(0);

	if ((int + 1) > 26)
		return String.fromCharCode(code + 25) + String.fromCharCode(code + (int % 25));
	else
		return String.fromCharCode(code + int);
}

/**
 * Character to Integer.
 * Converts a character(s) to integer.
 */
function charToInt(char) {
	const code = 'a'.charCodeAt(0);

	if (char.length > 1)
		return parseInt(char.substring(0, 1).charCodeAt(0) - code) + parseInt(char.substring(1, 2).charCodeAt(0) - code);
	else
		return char.charCodeAt(0) - code;
}

/**
 * Calculate Gesture of the Drowned Cooldown.
 */
function calcGotDCooldown(cooldown, amount) {
	return cooldown * 0.5 * Math.pow((1 - 0.15), amount - 1);
}