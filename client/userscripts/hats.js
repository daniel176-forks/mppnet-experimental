// MPP Hats by hri7566
setTimeout(function() {
    var API_BASE = "https://hats.hri7566.info/api";

    var RateLimit = (function() {
        function RateLimitClass(totalPoints, cooldown) {
            this.totalPoints = totalPoints;
            this.cooldown = cooldown;
            this.points = totalPoints;
            this.last = Date.now();
        }
        RateLimitClass.prototype.spend = function(points) {
            var result = false;
            if (Date.now() > this.last + this.cooldown) {
                this.points = this.totalPoints;
            }
            this.points -= points;
            if (this.points >= 0) {
                result = true;
            }
            this.last = Date.now();
            return result;
        };
        return RateLimitClass;
    })();

    var queryLimit = new RateLimit(100, 1000);
    var currentHat = "tophat";
    var storedHat = localStorage.getItem("hat");
    var storedCache = localStorage.getItem("hatCache");

    if (storedHat !== undefined && storedHat !== null) {
        currentHat = storedHat;
    }

    var hatCache = new Map();

    if (storedCache !== undefined && storedCache !== null) {
        var cacheObj = JSON.parse(storedCache);
        var key;
        for (key in cacheObj) {
            hatCache.set(key, cacheObj[key]);
        }
    }

    function getCurrentHat() {
        return currentHat;
    }

    function getHatBaseURL(hatId) {
        return new URL(API_BASE + "/hat?id=" + hatId);
    }

    function removeHat(userId) {
        var part = Object.values(MPP.client.ppl).find(function(p) { return p._id == userId; });
        if (!part) return;
        $(part.nameDiv).children(".mpp-hat").remove();
        $(part.cursorDiv).children(".name").children(".cursor-hat-conatiner").remove();
    }

    function applyHat(userId, hatId) {
        if (MPP.client.channel === undefined) return;
        var part = Object.values(MPP.client.ppl).find(function(p) { return p._id == userId; });
        if (!part) return;

        $(part.nameDiv).prepend('<div class="mpp-hat" data-hat-id="' + hatId + '"></div>');

        var cursorNameDiv = $(part.cursorDiv).children(".name");
        var cursorTagText = "";
        var cursorTagColor = "";
        var cursorNameText = $(part.cursorDiv).text();

        if (cursorNameDiv.children(".nametext").text().length !== 0) {
            cursorTagText = cursorNameDiv.children(".curtag").text();
            cursorTagColor = cursorNameDiv.children(".curtag").css("background-color");
            cursorNameText = cursorNameDiv.children(".nametext").text();
        }

        $(part.cursorDiv).children(".name").html(
            '<span class="nametext"></span><div class="cursor-hat-container"><div class="cursor-hat"></div></div>'
        ).find(".nametext").text(cursorNameText);

        if (cursorTagText.length !== 0) {
            $(part.cursorDiv).children(".name").prepend(
                '<span class="curtag" id="nametag-' + part._id + '" style="background-color: ' + cursorTagColor + ';">' + cursorTagText + '</span>'
            );
        }

        $(part.cursorDiv).children(".name").css({
            display: "block",
            "align-items": "center",
            position: "relative",
            "white-space": "nowrap",
            height: "fit-content",
            width: "fit-content",
            "line-height": "15px",
            "text-align": "center",
            "border-radius": "3px",
            left: "18px",
            top: "12px",
            "pointer-events": "none",
            color: "#fff",
            padding: "unset",
            "font-size": "unset"
        });

        $(part.cursorDiv).children(".name").children("span.nametext").css({
            display: "inline-block",
            "pointer-events": "none",
            color: "#fff",
            "border-radius": "2px",
            "margin-bottom": "1px",
            "white-space": "nowrap",
            "font-size": "10px"
        });

        var hat = $(part.nameDiv).children(".mpp-hat");
        var cursorHatContainer = $(part.cursorDiv).children(".name").children(".cursor-hat-container");
        var cursorHat = cursorHatContainer.children(".cursor-hat");

        hat.css({
            background: "url(" + API_BASE + "/hat?id=" + encodeURIComponent(hatId) + ")",
            width: "16px",
            height: "16px",
            position: "absolute",
            top: "-8px",
            left: "4px"
        });

        cursorHatContainer.css({
            display: "inline-block",
            position: "relative",
            top: "-24px",
            right: "0",
            height: "0",
            width: "16px"
        });

        cursorHat.css({
            content: "url(" + API_BASE + "/hat?id=" + encodeURIComponent(hatId) + ")"
        });

        if (MPP.client.channel.crown && MPP.client.channel.crown.userId == userId) {
            hat.css({ top: "-8px", left: "20px" });
            cursorHatContainer.css({ position: "absolute", top: "-6px", right: "17px" });
        }
    }

    function setPartHat(userId, hatId) {
        removeHat(userId);
        applyHat(userId, hatId);
        hatCache.set(userId, hatId);
        var table = {};
        var _iterator = hatCache.entries();
        for (var _step = _iterator.next(); !_step.done; _step = _iterator.next()) {
            var entry = _step.value;
            table[entry[0]] = entry[1];
        }
        localStorage.setItem("hatCache", JSON.stringify(table));
    }

    function getPartHat(userId) {
        var cached = hatCache.get(userId);
        if (cached !== undefined) return cached;
        if (queryLimit.spend()) {
            MPP.client.sendArray([{
                m: "custom",
                target: { mode: "id", id: userId },
                data: { m: "hat_query" }
            }]);
        }
    }

    function uncachePartHat(userId) {
        hatCache["delete"](userId);
    }

    function changeHat(id) {
        currentHat = id;
        localStorage.setItem("hat", getCurrentHat());
        setPartHat(MPP.client.getOwnParticipant()._id, id);
        MPP.client.sendArray([{
            m: "custom",
            target: { mode: "subscribed" },
            data: { m: "hat_change", hat: getCurrentHat() }
        }]);
        try {
            $("#mpp-hats-button-icon").attr("src", getHatBaseURL(getCurrentHat()).toString());
        } catch (e) {}
    }

    function getHatList() {
        return fetch(API_BASE + "/list").then(function(res) { return res.json(); });
    }

    function clearHatCache() {
        localStorage.removeItem("hatCache");
        localStorage.removeItem("hat");
    }

    MPP.hats = {
        getCurrentHat: getCurrentHat,
        getHatList: getHatList,
        changeHat: changeHat,
        clearHatCache: clearHatCache,
        getPartHat: getPartHat,
        getHatBaseURL: getHatBaseURL
    };

    var customPrefix = "hat_";
    var eventHandlers = {};

    function onHatCustom(msg) {
        var data = msg.data;
        if (typeof data.m !== "string") return;
        var evtn = data.m.substring(customPrefix.length).trim();
        var handler = eventHandlers[evtn];
        if (handler) handler(msg);
    }

    eventHandlers["query_reply"] = function(msg) {
        var hatId = msg.data.hat;
        if (hatId) setPartHat(msg.p.id, hatId);
    };

    eventHandlers["change"] = function(msg) {
        var hatId = msg.data.hat;
        if (hatId) setPartHat(msg.p.id, hatId);
    };

    MPP.client.on("custom", onHatCustom);
    MPP.client.on("participant added", function(p) { getPartHat(p._id); });
    MPP.client.on("participant removed", function(p) { uncachePartHat(p._id); });
    MPP.client.on("participant update", function(p) {
        var hatId = getPartHat(p._id);
        if (hatId) applyHat(p._id, hatId);
    });
    MPP.client.on("ch", function() { changeHat(getCurrentHat()); });

    MPP.client.on("c", function(msg) {
        if (!msg.c || typeof msg.c !== "object") return;
        for (var i = 0; i < msg.c.length; i++) {
            try {
                var item = msg.c[i];
                if (item.m == "dm") continue;
                var p = MPP.client.findParticipantById(item.p.id);
                if (!p) continue;
                var hatId = getPartHat(p._id);
                if (!hatId) continue;
                var hatSpan = '<span class="chat-hat" style="content: url(' + getHatBaseURL(hatId) + ');"></span>';
                var chatMsg = $("#chat ul li#msg-" + item.id);
                if (chatMsg.length) chatMsg.children(".name").before(hatSpan);
            } catch (e) { console.error(e); }
        }
    });

    MPP.client.on("a", function(msg) {
        try {
            var p = MPP.client.findParticipantById(msg.p.id);
            if (!p) return;
            var hatId = getPartHat(p._id);
            if (!hatId) return;
            var hatSpan = '<span class="chat-hat" style="content: url(' + getHatBaseURL(hatId) + ');"></span>';
            var chatMsg = $("#chat ul li#msg-" + msg.id);
            if (chatMsg.length) chatMsg.children(".name").before(hatSpan);
        } catch (e) { console.error(e); }
    });
}, 1000);

$(".mpp-hats-button").on("click", function() {
    $("#modal #modals > *").hide();
    $("#modal").fadeIn(250);
    $("#hats").show();
    $("#hat-selector").empty();
    var list = MPP.hats.getHatList();
    list.then(function(hats) {
        for (var hatId in hats) {
            $("#hat-selector").append('<option value="' + hatId + '">' + hats[hatId] + '</option>');
        }
        var current = MPP.hats.getCurrentHat();
        $('#hat-selector option[value="' + current + '"]').attr("selected", "true");
        $("#hat-selector-preview").attr("src", MPP.hats.getHatBaseURL(current).toString());
    });
});

$("#hats button.submit").on("click", function() {
    var hat = $("#hat-selector").val();
    MPP.hats.changeHat(hat);
    $("#modal").fadeOut(100);
    $("#modal #modals > *").hide();
});

$("#hats select#hat-selector").on("change", function() {
    var hat = this.value;
    $("#hat-selector-preview").attr("src", MPP.hats.getHatBaseURL(hat).toString());
});

$("#hats .clear-cache").on("click", function() {
    MPP.hats.clearHatCache();
});