// ==UserScript==
// @name         FlagRandomizer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Randomizes flag selection on 4chan /mlp/ with user-configurable options
// @author       (You)
// @match        *://boards.4channel.org/mlp*
// @match        *://boards.4chan.org/mlp*
// @run-at       document-end
// ==/UserScript==

window.FlagRandomizer = {};
window.FlagRandomizer.constant = {};
window.FlagRandomizer.constant.STORAGE_KEY_FLAGS = "flagRandomizerEligibleFlags";
window.FlagRandomizer.constant.STORAGE_KEY_ENABLED = "flagRandomizerEnabled";
window.FlagRandomizer.constant.STORAGE_KEY_PREVENT_DUPLICATES = "flagRandomizerPreventDuplicates";
window.FlagRandomizer.constant.STORAGE_KEY_LAST_ROLL = "flagRandomizerLastRoll";

window.FlagRandomizer.loadEligibleFlags = function() {
    try {
        var stored = localStorage.getItem(window.FlagRandomizer.constant.STORAGE_KEY_FLAGS);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch(e) {
        // Ignore errors
    }
    return [];
};

window.FlagRandomizer.saveEligibleFlags = function(flagArray) {
    try {
        localStorage.setItem(window.FlagRandomizer.constant.STORAGE_KEY_FLAGS, JSON.stringify(flagArray));
    } catch(e) {
        // Ignore errors
    }
};

window.FlagRandomizer.clearEligibleFlags = function() {
    window.FlagRandomizer.saveEligibleFlags([]);
};

window.FlagRandomizer.isRandomizerEnabled = function() {
    try {
        var stored = localStorage.getItem(window.FlagRandomizer.constant.STORAGE_KEY_ENABLED);
        if (stored === null) {
            return true;
        }
        return stored === "true";
    } catch(e) {
        return true;
    }
};

window.FlagRandomizer.setRandomizerEnabled = function(enabled) {
    try {
        localStorage.setItem(window.FlagRandomizer.constant.STORAGE_KEY_ENABLED, enabled.toString());
    } catch(e) {
        // Ignore errors
    }
};

window.FlagRandomizer.getPreventDuplicates = function() {
    try {
        var stored = localStorage.getItem(window.FlagRandomizer.constant.STORAGE_KEY_PREVENT_DUPLICATES);
        if (stored === null) {
            return false;
        }
        return stored === "true";
    } catch(e) {
        return false;
    }
};

window.FlagRandomizer.setPreventDuplicates = function(prevent) {
    try {
        localStorage.setItem(window.FlagRandomizer.constant.STORAGE_KEY_PREVENT_DUPLICATES, prevent.toString());
    } catch(e) {
        // Ignore errors
    }
};

window.FlagRandomizer.getLastRoll = function() {
    try {
        return localStorage.getItem(window.FlagRandomizer.constant.STORAGE_KEY_LAST_ROLL);
    } catch(e) {
        return null;
    }
};

window.FlagRandomizer.setLastRoll = function(flagValue) {
    try {
        localStorage.setItem(window.FlagRandomizer.constant.STORAGE_KEY_LAST_ROLL, flagValue);
    } catch(e) {
        // Ignore errors
    }
};

window.FlagRandomizer.extractFlagList = function(selectElement) {
    var flags = [];
    var options = selectElement.querySelectorAll('option');
    options.forEach(function(option) {
        flags.push({
            value: option.value,
            label: option.textContent
        });
    });
    return flags;
};

window.FlagRandomizer.randomizeFlag = function(selectElement) {
    if (!window.FlagRandomizer.isRandomizerEnabled()) {
        return;
    }

    var eligibleFlags = window.FlagRandomizer.loadEligibleFlags();
    if (eligibleFlags.length === 0) {
        return;
    }

    var randomIndex = Math.floor(Math.random() * eligibleFlags.length);
    var randomFlag = eligibleFlags[randomIndex];
    selectElement.value = randomFlag;
};

window.FlagRandomizer.randomizeAllFlags = function() {
    if (!window.FlagRandomizer.isRandomizerEnabled()) {
        return;
    }

    var eligibleFlags = window.FlagRandomizer.loadEligibleFlags();
    if (eligibleFlags.length === 0) {
        return;
    }

    var randomFlag;
    var maxAttempts = 100;
    var attempts = 0;

    do {
        var randomIndex = Math.floor(Math.random() * eligibleFlags.length);
        randomFlag = eligibleFlags[randomIndex];
        attempts++;

        var preventDuplicates = window.FlagRandomizer.getPreventDuplicates();
        var lastRoll = window.FlagRandomizer.getLastRoll();

        if (!preventDuplicates || randomFlag !== lastRoll || eligibleFlags.length === 1) {
            break;
        }
    } while (attempts < maxAttempts);

    window.FlagRandomizer.setLastRoll(randomFlag);

    var allSelectors = document.querySelectorAll('select.flagSelector');
    allSelectors.forEach(function(selector) {
        selector.value = randomFlag;
    });

    return randomFlag;
};

window.FlagRandomizer.addRandomizeButton = function(selectElement) {
    if (selectElement.dataset.hasRandomizer === "true") {
        return;
    }
    selectElement.dataset.hasRandomizer = "true";

    var button = document.createElement("button");
    button.type = "button";
    button.innerHTML = "🎲";
    button.title = "Randomize flag";
    button.style.marginLeft = "5px";
    button.style.cursor = "pointer";
    button.className = "flag-randomizer-btn";

    button.dataset.flagSelectorId = "flagsel_" + Date.now() + "_" + Math.random();
    selectElement.dataset.flagSelectorId = button.dataset.flagSelectorId;

    selectElement.parentNode.insertBefore(button, selectElement.nextSibling);
};

window.FlagRandomizer.processFlagSelector = function(selectElement, skipRandomize) {
    if (!skipRandomize) {
        window.FlagRandomizer.randomizeFlag(selectElement);
    }
    window.FlagRandomizer.addRandomizeButton(selectElement);
};

window.FlagRandomizer.processAllFlagSelectors = function() {
    var selectors = document.querySelectorAll('select.flagSelector');
    selectors.forEach(function(selector) {
        window.FlagRandomizer.processFlagSelector(selector, true);
    });
    window.FlagRandomizer.randomizeAllFlags();
};

window.FlagRandomizer.setupObserver = function() {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }

    var observer = new MutationObserver(function(mutations) {
        var newSelectorsFound = false;

        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('flagSelector')) {
                        window.FlagRandomizer.processFlagSelector(node, true);
                        newSelectorsFound = true;
                    }
                    if (node.querySelectorAll) {
                        var selectors = node.querySelectorAll('select.flagSelector');
                        if (selectors.length > 0) {
                            selectors.forEach(function(selector) {
                                window.FlagRandomizer.processFlagSelector(selector, true);
                            });
                            newSelectorsFound = true;
                        }
                    }
                }
            });
        });

        if (newSelectorsFound) {
            window.FlagRandomizer.randomizeAllFlags();
        }
    });

    observer.observe(document.body, {childList: true, subtree: true});
};

window.FlagRandomizer.buildOptionsPanel = function() {
    var style = "top:150px;right:10px;position:absolute;background:#fff;border:1px solid #000;padding:10px;z-index:10000;max-height:80vh;overflow-y:auto;";
    var parent = document.body;

    var openButton = document.createElement("button");
    openButton.innerHTML = "Flag Randomizer Options";
    openButton.style.cssText = "top:150px;right:10px;position:absolute;z-index:9999;";
    parent.appendChild(openButton);

    var container = document.createElement("div");
    container.style.cssText = style;
    container.style.display = "none";

    var header = document.createElement("div");
    header.innerHTML = "<strong>Flag Randomizer Settings</strong>";
    header.style.marginBottom = "10px";
    container.appendChild(header);

    var closeButton = document.createElement("button");
    closeButton.innerHTML = "X";
    closeButton.style.cssText = "float:right;cursor:pointer;";
    closeButton.onclick = function() {
        container.style.display = "none";
        openButton.style.display = "block";
    };
    header.appendChild(closeButton);

    var toggleDiv = document.createElement("div");
    toggleDiv.style.cssText = "margin:10px 0;padding:10px;background:#f0f0f0;border:1px solid #ccc;";

    var toggleLabel = document.createElement("label");
    toggleLabel.style.cssText = "font-weight:bold;cursor:pointer;";

    var toggleCheckbox = document.createElement("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.checked = window.FlagRandomizer.isRandomizerEnabled();
    toggleCheckbox.style.marginRight = "5px";
    toggleCheckbox.onchange = function() {
        window.FlagRandomizer.setRandomizerEnabled(toggleCheckbox.checked);
        updateStatus();
    };

    toggleLabel.appendChild(toggleCheckbox);
    toggleLabel.appendChild(document.createTextNode("Enable Randomization"));
    toggleDiv.appendChild(toggleLabel);
    container.appendChild(toggleDiv);

    var duplicatesDiv = document.createElement("div");
    duplicatesDiv.style.cssText = "margin:10px 0;padding:10px;background:#f0f0f0;border:1px solid #ccc;";

    var duplicatesLabel = document.createElement("label");
    duplicatesLabel.style.cssText = "cursor:pointer;";

    var duplicatesCheckbox = document.createElement("input");
    duplicatesCheckbox.type = "checkbox";
    duplicatesCheckbox.checked = window.FlagRandomizer.getPreventDuplicates();
    duplicatesCheckbox.style.marginRight = "5px";
    duplicatesCheckbox.onchange = function() {
        window.FlagRandomizer.setPreventDuplicates(duplicatesCheckbox.checked);
    };

    duplicatesLabel.appendChild(duplicatesCheckbox);
    duplicatesLabel.appendChild(document.createTextNode("Prevent same flag twice in a row"));
    duplicatesDiv.appendChild(duplicatesLabel);
    container.appendChild(duplicatesDiv);

    var statusDiv = document.createElement("div");
    statusDiv.style.cssText = "margin:10px 0;font-style:italic;";
    container.appendChild(statusDiv);

    function updateStatus() {
        var eligibleFlags = window.FlagRandomizer.loadEligibleFlags();
        var enabled = window.FlagRandomizer.isRandomizerEnabled();
        var status = eligibleFlags.length + " flag" + (eligibleFlags.length !== 1 ? "s" : "") + " selected";
        if (!enabled) {
            status += " (Randomization disabled)";
        } else if (eligibleFlags.length === 0) {
            status += " (Using site default)";
        }
        statusDiv.textContent = status;
    }

    var controlDiv = document.createElement("div");
    controlDiv.style.marginBottom = "10px";

    var selectAllButton = document.createElement("button");
    selectAllButton.innerHTML = "Select All";
    selectAllButton.onclick = function() {
        var checkboxes = container.querySelectorAll('.flag-checkbox');
        checkboxes.forEach(function(cb) {
            cb.checked = true;
        });
        saveFlagSelection();
        updateStatus();
    };
    controlDiv.appendChild(selectAllButton);

    var clearAllButton = document.createElement("button");
    clearAllButton.innerHTML = "Clear All";
    clearAllButton.style.marginLeft = "5px";
    clearAllButton.onclick = function() {
        var checkboxes = container.querySelectorAll('.flag-checkbox');
        checkboxes.forEach(function(cb) {
            cb.checked = false;
        });
        saveFlagSelection();
        updateStatus();
    };
    controlDiv.appendChild(clearAllButton);

    var clearEqgButton = document.createElement("button");
    clearEqgButton.innerHTML = "Clear EQG";
    clearEqgButton.style.marginLeft = "5px";
    clearEqgButton.onclick = function() {
        var eqgFlags = ["ADA", "AB", "SON", "SUS", "EQA", "EQF", "EQP", "EQR", "EQT", "EQI", "EQS", "ERA"];
        var checkboxes = container.querySelectorAll('.flag-checkbox');
        checkboxes.forEach(function(cb) {
            if (eqgFlags.indexOf(cb.value) !== -1) {
                cb.checked = false;
            }
        });
        saveFlagSelection();
        updateStatus();
    };
    controlDiv.appendChild(clearEqgButton);

    var clearG5Button = document.createElement("button");
    clearG5Button.innerHTML = "Clear G5";
    clearG5Button.style.marginLeft = "5px";
    clearG5Button.onclick = function() {
        var g5Flags = ["HT", "IZ", "PP", "SS", "SPT", "ZS"];
        var checkboxes = container.querySelectorAll('.flag-checkbox');
        checkboxes.forEach(function(cb) {
            if (g5Flags.indexOf(cb.value) !== -1) {
                cb.checked = false;
            }
        });
        saveFlagSelection();
        updateStatus();
    };
    controlDiv.appendChild(clearG5Button);

    var clearTfhButton = document.createElement("button");
    clearTfhButton.innerHTML = "Clear TFH";
    clearTfhButton.style.marginLeft = "5px";
    clearTfhButton.onclick = function() {
        var tfhFlags = ["TFA", "TFO", "TFP", "TFS", "TFT", "TFV", "TP"];
        var checkboxes = container.querySelectorAll('.flag-checkbox');
        checkboxes.forEach(function(cb) {
            if (tfhFlags.indexOf(cb.value) !== -1) {
                cb.checked = false;
            }
        });
        saveFlagSelection();
        updateStatus();
    };
    controlDiv.appendChild(clearTfhButton);

    container.appendChild(controlDiv);

    var flagsContainer = document.createElement("div");
    flagsContainer.style.cssText = "max-height:400px;overflow-y:auto;border:1px solid #ccc;padding:5px;background:#fff;";

    var firstSelector = document.querySelector('select.flagSelector');
    if (firstSelector) {
        var flagList = window.FlagRandomizer.extractFlagList(firstSelector);
        var eligibleFlags = window.FlagRandomizer.loadEligibleFlags();

        flagList.forEach(function(flag) {
            var flagDiv = document.createElement("div");
            flagDiv.style.margin = "2px 0";

            var checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "flag-checkbox";
            checkbox.value = flag.value;
            checkbox.checked = eligibleFlags.indexOf(flag.value) !== -1;
            checkbox.onchange = function() {
                saveFlagSelection();
                updateStatus();
            };

            var label = document.createElement("label");
            label.style.cursor = "pointer";
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(" " + flag.label + " (" + flag.value + ")"));

            flagDiv.appendChild(label);
            flagsContainer.appendChild(flagDiv);
        });
    }

    container.appendChild(flagsContainer);

    function saveFlagSelection() {
        var checkboxes = container.querySelectorAll('.flag-checkbox');
        var selected = [];
        checkboxes.forEach(function(cb) {
            if (cb.checked) {
                selected.push(cb.value);
            }
        });
        window.FlagRandomizer.saveEligibleFlags(selected);
    }

    parent.appendChild(container);

    openButton.onclick = function() {
        openButton.style.display = "none";
        container.style.display = "block";
        updateStatus();
    };

    updateStatus();
};

window.FlagRandomizer.setupGlobalClickHandler = function() {
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('flag-randomizer-btn')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (!window.FlagRandomizer.isRandomizerEnabled()) {
                alert("Randomizer is currently disabled. Enable it in the Flag Randomizer Options.");
                return false;
            }

            var eligibleFlags = window.FlagRandomizer.loadEligibleFlags();
            if (eligibleFlags.length === 0) {
                alert("No flags selected for randomization. Please select flags in the Flag Randomizer Options.");
                return false;
            }

            window.FlagRandomizer.randomizeAllFlags();

            return false;
        }
    }, true);
};

var installer = function() {
    window.FlagRandomizer.setupGlobalClickHandler();
    window.FlagRandomizer.processAllFlagSelectors();
    window.FlagRandomizer.setupObserver();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.FlagRandomizer.buildOptionsPanel();
        });
    } else {
        window.FlagRandomizer.buildOptionsPanel();
    }
};

installer();
