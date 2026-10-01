//========================================================================================
// Global Vars
//========================================================================================
var $procSim; // .preferences element. Stored after tippy has been mounted
var $procSimOutput;

//========================================================================================
// Main Event Triggers
//========================================================================================

/* Run init() on page load
==========================================================*/
document.addEventListener("DOMContentLoaded", function() { initSims(); }, false);


//========================================================================================
// Init
//========================================================================================
/**
 * Init
 */
function initSims() {

	/* Dom Element Vars
	==========================================================*/

	/* Events
	==========================================================*/
	$(document.body)
		// Click Simulate Button
		.on("click", "button.simulate", function(e) {
			simulate();
		})

		// Change Sim Input Values
		.on("keyup change input paste propertychange", ".proc-sim-form input", function(e) {
			simulate();
		});

	/* Interface
	==========================================================*/
	// Proc Sims Tooltip
	tippy(".proc-sim", {
		content(reference) {
			const template = document.getElementById("proc-sim");
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
		onMount: function(instance) {
			$procSim = $(".proc-sim-form");
			$procSimOutput = $("#proc-sim-output");

			// General Tooltips w/ Data Attribute
			tippy("[data-tippy-content]", {
				arrow: tippy.roundArrow,
				theme: "scuzz-inline",
				maxWidth: 350,
				duration: [100, 50],
			});
		},
	});

}


//========================================================================================
// Functions
//========================================================================================
function simulate() {
	var attackProcCoef = parseFloat($procSim.find("input.attack-proc-coef").val());
	var attackHits = parseFloat($procSim.find("input.attack-hits").val());
	var attackDuration = parseFloat($procSim.find("input.attack-duration").val());
	var attackSpeed = parseFloat($procSim.find("input.attack-speed").val());
	var attackCount = parseFloat($procSim.find("input.attack-count").val());
	var simCount = parseFloat($procSim.find("input.sim-count").val());
	var itemProcCoef = parseFloat($procSim.find("input.item-proc").val());
	var clovers = parseFloat($procSim.find("input.clovers").val());

	// calculated numbers
	var attacksPerSecond = attackDuration / attackSpeed;
	var hitsPerSecond = attacksPerSecond * attackHits;
	var totalDuration = attacksPerSecond * attackCount;

	var doSimItem = (itemProcCoef > 0) ? true : false;
	var hitProcs = 0;
	var itemProcs = 0;
	var minHitProcs = 9999;
	var maxHitProcs = 0;
	var minItemProcs = 9999;
	var maxItemProcs = 0;
	var simHitProcs;
	var simItemProcs;

	// run the simluations
	for (var c = 0; c < simCount; c++) {
		simHitProcs = 0;
		simItemProcs = 0;

		for (var h = 0; h < attackHits * attackCount; h++) {
			if (Math.random() < attackProcCoef) {
				simHitProcs++;

				for (var l = 0; l < (1 + clovers); l++) {
					if (doSimItem && Math.random() < itemProcCoef) {
						simItemProcs++;
						break;
					}
				}
			}
		}

		hitProcs += simHitProcs;
		itemProcs += simItemProcs;

		minHitProcs = (simHitProcs < minHitProcs) ? simHitProcs : minHitProcs;
		maxHitProcs = (simHitProcs > maxHitProcs) ? simHitProcs : maxHitProcs;
		minItemProcs = (simItemProcs < minItemProcs) ? simItemProcs : minItemProcs;
		maxItemProcs = (simItemProcs > maxItemProcs) ? simItemProcs : maxItemProcs;
	}

	// output
	$procSimOutput.html("");
	simOutput("Simulations", simCount);
	simOutput("Duration", totalDuration.toFixed(2) + "s");
	simOutput("Hits", (attackHits * attackCount).toFixed(2));
	simOutput("Avg Hit Procs", (hitProcs / simCount).toFixed(2));
	simOutput("Avg Item Procs", (itemProcs / simCount).toFixed(2));
	simOutput("Avg Hit Procs Per Second", (hitProcs / totalDuration / simCount).toFixed(2));
	simOutput("Avg Item Procs Per Second", (itemProcs / totalDuration / simCount).toFixed(2));
	simOutput("Minimum Hit Procs", minHitProcs.toFixed(2));
	simOutput("Maximum Hit Procs", maxHitProcs.toFixed(2));
	simOutput("Minimum Item Procs", minItemProcs.toFixed(2));
	simOutput("Maximum Item Procs", maxItemProcs.toFixed(2));

}

function simOutput(labelOrValue, value) {
	var label = '';
	if (value === undefined) {
		value = labelOrValue;
	} else {
		label = labelOrValue;
	}

	var html = '';
	html += '<div class="data">' + value + '</div>';
	html += '<label>' + label + '</label>';

	$procSimOutput.append(html);
}