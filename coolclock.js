	
// Constructor for CoolClock objects
window.CoolClock = function(options) {
	return this.init(options);
}

// Config contains some defaults, and clock skins
CoolClock.config = {
	tickDelay: 1000,
	longTickDelay: 15000,
	defaultRadius: 85,
	renderRadius: 100,
	defaultSkin: "chunkySwiss",
	defaultFont: "15px sans-serif",
	// Should be in skin probably...
	// (TODO: allow skinning of digital display)
	showSecs: true,
	showAmPm: true,

	skins:	{
		// There are more skins in moreskins.js
		// Try making your own skin by copy/pasting one of these and tweaking it
		swissRail: {
			outerBorder: { lineWidth: 2, radius:95, color: "black", alpha: 1 },
			smallIndicator: { lineWidth: 1, startAt: 88, endAt: 92, color: "black", alpha: 1 },
			largeIndicator: { lineWidth: 4, startAt: 79, endAt: 92, color: "black", alpha: 1, font: "8px sans-serif" },
			hugeIndicator: { lineWidth: 4, startAt: 70, endAt: 92, color: "black", alpha: 1, font: "20px sans-serif" },
/* 			hourHand: { lineWidth: 8, startAt: -15, endAt: 50, color: "black", alpha: 1 }, */
/* 			minuteHand: { lineWidth: 7, startAt: -15, endAt: 75, color: "black", alpha: 1 }, */
			secondHand: { lineWidth: 1, startAt: 0, endAt: 85, color: "red", alpha: 1 },
			secondDecoration: { lineWidth: 1, startAt: 70, radius: 4, fillColor: "red", color: "red", alpha: 1 }
		},
		chunkySwiss: {
			outerBorder: { lineWidth: 4, radius:97, color: "black", alpha: 1 },
			smallIndicator: { lineWidth: 4, startAt: 89, endAt: 93, color: "black", alpha: 1 },
			largeIndicator: { lineWidth: 8, startAt: 80, endAt: 93, color: "black", alpha: 1 },
			hourHand: { lineWidth: 12, startAt: -15, endAt: 60, color: "black", alpha: 1 },
			minuteHand: { lineWidth: 10, startAt: -15, endAt: 85, color: "black", alpha: 1 },
			secondHand: { lineWidth: 4, startAt: -20, endAt: 85, color: "red", alpha: 1 },
			secondDecoration: { lineWidth: 2, startAt: 70, radius: 8, fillColor: "red", color: "red", alpha: 1 }
		},
		chunkySwissOnBlack: {
			outerBorder: { lineWidth: 4, radius:97, color: "white", alpha: 1 },
			smallIndicator: { lineWidth: 4, startAt: 89, endAt: 93, color: "white", alpha: 1 },
			largeIndicator: { lineWidth: 8, startAt: 80, endAt: 93, color: "white", alpha: 1 },
			hourHand: { lineWidth: 12, startAt: -15, endAt: 60, color: "white", alpha: 1 },
			minuteHand: { lineWidth: 10, startAt: -15, endAt: 85, color: "white", alpha: 1 },
			secondHand: { lineWidth: 4, startAt: -20, endAt: 85, color: "red", alpha: 1 },
			secondDecoration: { lineWidth: 2, startAt: 70, radius: 8, fillColor: "red", color: "red", alpha: 1 }
		}

	},

	// Test for IE so we can nurse excanvas in a couple of places
	isIE: !!document.all,

	// Will store (a reference to) each clock here, indexed by the id of the canvas element
	clockTracker: {},

	// For giving a unique id to coolclock canvases with no id
	noIdCount: 0
};

// Define the CoolClock object's methods
CoolClock.prototype = {

	// Initialise using the parameters parsed from the colon delimited class
	init: function(options) {
		// Parse and store the options
		this.canvasId       = options.canvasId;
		this.skinId         = options.skinId || CoolClock.config.defaultSkin;
		this.font           = options.font || CoolClock.config.defaultFont;
		this.displayRadius  = options.displayRadius || CoolClock.config.defaultRadius;
		this.renderRadius   = options.renderRadius || CoolClock.config.renderRadius;
		this.showSecondHand = typeof options.showSecondHand == "boolean" ? options.showSecondHand : true;
		this.gmtOffset      = (options.gmtOffset != null && options.gmtOffset != '') ? parseFloat(options.gmtOffset) : null;
		this.showDigital    = typeof options.showDigital == "boolean" ? options.showDigital : false;
		this.logClock       = typeof options.logClock == "boolean" ? options.logClock : false;
		this.logClockRev    = typeof options.logClock == "boolean" ? options.logClockRev : false;

		this.tickDelay      = CoolClock.config[ this.showSecondHand ? "tickDelay" : "longTickDelay" ];

		// Get the canvas element
		this.canvas = document.getElementById(this.canvasId);

		// Make the canvas the requested size. It's always square.
		this.canvas.setAttribute("width",this.displayRadius*2);
		this.canvas.setAttribute("height",this.displayRadius*2);
		this.canvas.style.width = this.displayRadius*2 + "px";
		this.canvas.style.height = this.displayRadius*2 + "px";

		// Determine by what factor to relate skin values to canvas positions.
		// renderRadius is the max skin positional value before leaving the
		// canvas. displayRadius is half the width and height of the canvas in
		// pixels. If they are equal, there is a 1:1 relation of skin position
		// values to canvas pixels. Setting both to 200 allows 100px of space
		// around clock skins to add your own things: this is due to current
		// skins maxing out at a positional value of 100.
		this.scale = this.displayRadius / this.renderRadius;

		// Initialise canvas context
		this.ctx = this.canvas.getContext("2d");
		this.ctx.scale(this.scale,this.scale);

		// Keep track of this object
		CoolClock.config.clockTracker[this.canvasId] = this;

		// should we be running the clock?
		this.render(0);

		return this;
	},

	// Draw a circle at point x,y with params as defined in skin
	fullCircleAt: function(x,y,skin) {
		this.ctx.save();
		this.ctx.globalAlpha = skin.alpha;
		this.ctx.lineWidth = skin.lineWidth;

		if (!CoolClock.config.isIE) {
			this.ctx.beginPath();
		}

		if (CoolClock.config.isIE) {
			// excanvas doesn't scale line width so we will do it here
			this.ctx.lineWidth = this.ctx.lineWidth * this.scale;
		}

		this.ctx.arc(x, y, skin.radius, 0, 2*Math.PI, false);

		if (CoolClock.config.isIE) {
			// excanvas doesn't close the circle so let's fill in the tiny gap
			this.ctx.arc(x, y, skin.radius, -0.1, 0.1, false);
		}

		if (skin.fillColor) {
			this.ctx.fillStyle = skin.fillColor
			this.ctx.fill();
		}
		if (skin.color) {
			this.ctx.strokeStyle = skin.color;
			this.ctx.stroke();
		}
		this.ctx.restore();
	},

	// Draw some text centered vertically and horizontally
	drawTextAt: function(theText,x,y,skin) {
		if (!skin) skin = this.getSkin();
		this.ctx.save();
		this.ctx.font = skin.font || this.font;
		var tSize = this.ctx.measureText(theText);
		// TextMetrics rarely returns a height property: use baseline instead.
		if (!tSize.height) {
			tSize.height = 0;
			this.ctx.textBaseline = 'middle';
		}
		this.ctx.fillText(theText, x - tSize.width/2, y - tSize.height/2);
		this.ctx.restore();
	},

	lpad2: function(num) {
		return (num < 10 ? '0' : '') + num;
	},

	tickAngle: function(second) {
		// Log algorithm by David Bradshaw
		var tweak = 3; // If it's lower the one second mark looks wrong (?)
		if (this.logClock) {
			return second == 0 ? 0 : (Math.log(second*tweak) / Math.log(720*tweak));
		}
		else if (this.logClockRev) {
			// Flip the seconds then flip the angle (trickiness)
			second = (720 - second) % 720;
			return 1.0 - (second == 0 ? 0 : (Math.log(second*tweak) / Math.log(720*tweak)));
		}
		else {
			return second/720.0;
		}
	},

	timeText: function(hour,min,sec) {
		var c = CoolClock.config;
		return '' +
			(c.showAmPm ? ((hour%12)==0 ? 12 : (hour%12)) : hour) + ':' +
			this.lpad2(min) +
			(c.showSecs ? ':' + this.lpad2(sec) : '') +
			(c.showAmPm ? (hour < 12 ? ' am' : ' pm') : '')
		;
	},

	// Draw a radial line by rotating then drawing a straight line
	// Ha ha, I think I've accidentally used Taus, (see http://tauday.com/)
	radialLineAtAngle: function(angleFraction,skin) {
		this.ctx.save();
		this.ctx.translate(this.renderRadius,this.renderRadius);
		this.ctx.rotate(Math.PI * (2.0 * angleFraction - 0.5));
		this.ctx.globalAlpha = skin.alpha;
		this.ctx.strokeStyle = skin.color;
		this.ctx.lineWidth = skin.lineWidth;
		if (CoolClock.config.isIE)
			// excanvas doesn't scale line width so we will do it here
			this.ctx.lineWidth = this.ctx.lineWidth * this.scale;

		if (skin.radius) {
			this.fullCircleAt(skin.startAt,0,skin)
		}
		else {
			this.ctx.beginPath();
			this.ctx.moveTo(skin.startAt,0)
			this.ctx.lineTo(skin.endAt,0);
			this.ctx.stroke();
		}
		this.ctx.restore();
	},

	textAtAngle: function(theText,angleFraction,skin) {
		this.ctx.save();
		this.ctx.translate(this.renderRadius,this.renderRadius);
		this.ctx.rotate((Math.PI * (2.0 * angleFraction - 0.5)));		
		this.ctx.font = skin.font;
		
		var tSize = this.ctx.measureText(theText);
		// TextMetrics rarely returns a height property: use baseline instead.
		if (!tSize.height) {
			tSize.height = 0;
			this.ctx.textBaseline = 'middle';
		}
				
		if( angleFraction > 0.5 )
		{
			this.ctx.rotate(Math.PI);
			this.ctx.translate(-(this.renderRadius),0);
			this.ctx.fillText(theText, (this.renderRadius - skin.startAt), 0);
		}
		else
		{
			this.ctx.fillText(theText, this.renderRadius-tSize.width-(this.renderRadius-skin.startAt)-1, 0);
		}
				
								
		this.ctx.restore();
	},

	render: function(sec) {
		// Get the skin
		var skin = this.getSkin();

		// Clear
		this.ctx.clearRect(0,0,this.renderRadius*2,this.renderRadius*2);

		// Draw the outer edge of the clock
		if (skin.outerBorder)
			this.fullCircleAt(this.renderRadius,this.renderRadius,skin.outerBorder);

		// Store clock labels here; probably should be elsewhere
		var labels = {
			0: "Time",
			60: "Revolution",
			120: "Enterprise",
			180: "Film",
			240: "Deconstruction",
			300: "Immortality",
			360: "Plot",
			420: "Sound",
			480: "Environment",
			540: "Story",
			600: "Speed",
			660: "Altar"
		}

		// Draw the tick marks. Every 5th one is a big one
		for (var i=0;i<720;i++) {
			if(!(i%180)) {
				this.textAtAngle(labels[i],this.tickAngle(i),skin.hugeIndicator);
				this.radialLineAtAngle(this.tickAngle(i),skin.hugeIndicator);
			} else if(!(i%60)) {
				this.textAtAngle(labels[i],this.tickAngle(i),skin.largeIndicator,50);
				this.radialLineAtAngle(this.tickAngle(i),skin.largeIndicator);
			} else if(!(i%5))  {
				this.radialLineAtAngle(this.tickAngle(i),skin.smallIndicator)
			}
		}
				
		// Draw the hands
		if (skin.secondDecoration)
			this.radialLineAtAngle(this.tickAngle(sec),skin.secondDecoration);
						
		this.radialLineAtAngle(this.tickAngle(sec),skin.secondHand);

		if (this.extraRender) {
			this.extraRender(hour,min,sec);
		}
	},

	getSkin: function() {
		var skin = CoolClock.config.skins[this.skinId];
		if (!skin) skin = CoolClock.config.skins[CoolClock.config.defaultSkin];
		return skin;
	},
	
	getSec: function(x, y)
	{
		x = x - this.displayRadius;
		y = this.displayRadius - y;
		
		angle = Math.atan2(y,x);
		
		sec = angle/Math.PI;
		sec = Math.round( sec*360);
		
		if( sec < 0 )
		{
			sec = 180 + Math.abs(sec);
		}
		else if( sec > 180 )
		{
			sec = 540 + (360 - sec );
		}
		else
		{
			sec = 180 - sec;
		}
		
		return sec;
				
	}
};

// Find all canvas elements that have the CoolClock class and turns them into clocks
CoolClock.findAndCreateClocks = function() {
	// (Let's not use a jQuery selector here so it's easier to use frameworks other than jQuery)
	var canvases = document.getElementsByTagName("canvas");
	for (var i=0;i<canvases.length;i++) {
		// Pull out the fields from the class. Example "CoolClock:chunkySwissOnBlack:1000"
		var fields = canvases[i].className.split(" ")[0].split(":");
		if (fields[0] == "CoolClock") {
			if (!canvases[i].id) {
				// If there's no id on this canvas element then give it one
				canvases[i].id = '_coolclock_auto_id_' + CoolClock.config.noIdCount++;
			}
			// Create a clock object for this element
			new CoolClock({
				canvasId:       canvases[i].id,
				skinId:         fields[1],
				displayRadius:  fields[2],
				showSecondHand: fields[3]!='noSeconds',
				gmtOffset:      fields[4],
				showDigital:    fields[5]=='showDigital',
				logClock:       fields[6]=='logClock',
				logClockRev:    fields[6]=='logClockRev'
			});
		}
	}
};

// Handle our scrolling magic
writtenChronograph = {
	buildChrono: function()
	{
		var t = 0;
		var li = $('#essay li.active');
		
		while( t < 721)
		{
			li.attr('data-time', t);
			t = t + parseInt(li.attr('data-duration'));
			li = li.next();
		}
		
		// duplicate last 12 minutes and put them at beginning
	},
	getClock: function()
	{
		return CoolClock.config.clockTracker.clk1;
	},
	refreshClock: function()
	{
		// sec = Math.round( 720 * this.getPosition());
				
		this.getClock().render( $('#essay li.active').attr('data-time') );
	},
	getPosition: function()
	{
		var s = $(window).scrollTop();
		d = $(document).height();
		c = $(window).height();
		scrollPercent = (s / (d-c));
		
		return scrollPercent;
	},
	checkPosition: function()
	{
		// refresh the clock
		this.refreshClock();
		
		// keep the active element in view
		target = 400;
		if( $('li.active').offset().top != target )
		{			
			$('#essay').css('top', parseInt($('#essay').css('top')) + (target - $('li.active').offset().top));
		}
		
		// update opacities
		$('li').css('opacity',0);
		$('li.active').css('opacity',1);
		
		var nexter = $('li.active').next();
		var prever = $('li.active').prev();
		for (var i=0;i<5;i++) {
			nexter.add(prever).css('opacity',( 0.5 - i/10));
			nexter = nexter.next();
			prever = prever.prev();
		}
		// setTimeout("writtenChronograph.checkPosition();", 5);
	},
	nextItem: function()
	{
		if( !$('li.active').hasClass('last') )
		{
			writtenChronograph.activate( $('li.active').next() );
		}
	},
	activate: function( li )
	{
		$('li.active').removeClass('active');
		li.addClass('active');
		writtenChronograph.checkPosition();
		
		if( $('object', li)[0] )
		{
			ytplayer = document.getElementById("myytplayer");
			ytplayer.playVideo();
		}
		
	},
	goTo: function( sec )
	{
		li = $('#essay li:first');
		while( li.next().length > 0 )
		{
			if( li.next().attr('data-time') > sec )
			{
				writtenChronograph.activate( li );
				break;
			}
			li = li.next();
		}
	},
	init: function() {
		writtenChronograph.buildChrono();
		writtenChronograph.checkPosition();
		
		// allow us to click in the chronograph
		$('canvas').click(function(v){
			var mX = v.pageX - $('canvas').offset().left;
			var mY = v.pageY - $('canvas').offset().top;
			
			sec = writtenChronograph.getClock().getSec(mX, mY);
			
			writtenChronograph.goTo( sec );

	    });
		
		// bind to down arrow
		$(document).keydown(function(e){
			if( e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 )
			{
				// prevent keyboard scrolling
				return false;
			}
			else if (e.keyCode == 40) { 
				writtenChronograph.nextItem();
				return false;
		    }
		});
		
	}
}

function onYouTubePlayerReady(playerId) {
      ytplayer = document.getElementById("myytplayer");
    }

$(document).ready(function() {
	CoolClock.findAndCreateClocks();
	writtenChronograph.init();
});