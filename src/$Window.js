
$Window.Z_INDEX = 5;

function $Window(options){
	options = options || {};
	
	var $w = $(E("div")).addClass("window").appendTo("body");
	$w.$titlebar = $(E("div")).addClass("window-titlebar").appendTo($w);
	$w.$title_area = $(E("div")).addClass("window-title-area").appendTo($w.$titlebar);
	$w.$title = $(E("span")).addClass("window-title").appendTo($w.$title_area);
	$w.$minimize = $(E("button")).addClass("window-minimize-button window-button").appendTo($w.$titlebar);
	$w.$maximize = $(E("button")).addClass("window-maximize-button window-button").appendTo($w.$titlebar);
	$w.$x = $(E("button")).addClass("window-close-button window-button").appendTo($w.$titlebar);
	$w.$content = $(E("div")).addClass("window-content").appendTo($w);
	
	var $component = options.$component;
	if(options.icon){
		$w.icon_name = options.icon;
		$w.$icon = $Icon(options.icon, TITLEBAR_ICON_SIZE).prependTo($w.$titlebar);
	}
	if($component){
		$w.addClass("component-window");
	}
	
	$w.attr("touch-action", "none");
	
	$w.$x.on("click", function(){
		$w.close();
	});
	let before_maximize;
	$w.$maximize.on("click", function(){
		// TODO: make programs update iframes
		// TODO: account for taskbar
		if ($w.hasClass("maximized")) {
			$w.removeClass("maximized");
			$w.css({width: "", height: ""});
			if (before_maximize) {
				$w.css({
					left: before_maximize.left,
					top: before_maximize.top,
					width: before_maximize.width,
					height: before_maximize.height,
				});
			}
		} else {
			before_maximize = {
				left: $w.css("left"),
				top: $w.css("top"),
				width: $w.css("width"),
				height: $w.css("height"),
			};
			$w.addClass("maximized");
			$w.css({width: "100vw", height: "100vh"});
		}
		$w.applyBounds();
		$w.css("transform", "");
	});
	$w.$minimize.on("click", function(){
		// TODO: do something legitimate
		const scale_match = $w[0].style.transform.match(/scale\(([\d\.]+)\)/);
		const scale = scale_match ? scale_match[1] : 1;
		// console.log(scale_match, $w[0].style.transform, $w.css("transform"));
		$w.css("transform", `scale(${scale*0.9})`);
	});
	$w.$title_area.on("mousedown selectstart", ".window-button", function(e){
		e.preventDefault();
	});
	$w.$title_area.on("dblclick", ()=> {
		$w.$maximize.triggerHandler("click");
	});
	
	$w.css({
		position: "absolute",
		zIndex: $Window.Z_INDEX++
	});
	$w.bringToFront = function(){
		$w.css({
			zIndex: $Window.Z_INDEX++
		});
	};
	$w.on("pointerdown", function(){
		$w.bringToFront();
	});
	
	$w.on("keydown", function(e){
		if(e.ctrlKey || e.altKey || e.shiftKey){
			return;
		}
		var $buttons = $w.$content.find("button");
		var $focused = $(document.activeElement);
		var focused_index = $buttons.index($focused);
		// console.log(e.keyCode);
		switch(e.keyCode){
			case 40: // Down
			case 39: // Right
				if($focused.is("button")){
					if(focused_index < $buttons.length - 1){
						$buttons.get(focused_index + 1).focus();
						e.preventDefault();
					}
				}
				break;
			case 38: // Up
			case 37: // Left
				if($focused.is("button")){
					if(focused_index > 0){
						$buttons.get(focused_index - 1).focus();
						e.preventDefault();
					}
				}
				break;
			case 32: // Space
			case 13: // Enter (doesn't actually work in chrome because the button gets clicked immediately)
				if($focused.is("button")){
					$focused.addClass("pressed");
					var release = function(){
						$focused.removeClass("pressed");
						$focused.off("focusout", release);
						$(window).off("keyup", keyup);
					};
					var keyup = function(e){
						if(e.keyCode === 32 || e.keyCode === 13){
							release();
						}
					};
					$focused.on("focusout", release);
					$(window).on("keyup", keyup);
				}
				break;
			case 9: // Tab
				// wrap around when tabbing through controls in a window
				var $controls = $w.$content.find("input, textarea, select, button, a");
				var focused_control_index = $controls.index($focused);
				if(focused_control_index === $controls.length - 1){
					e.preventDefault();
					$controls[0].focus();
				}
				break;
			case 27: // Esc
				$w.close();
				break;
		}
	});
	// @TODO: restore last focused controls when clicking/mousing down on the window
	
	$w.applyBounds = function(){
		$w.css({
			left: Math.max(0, Math.min(innerWidth - $w.width(), $w.position().left)),
			top: Math.max(0, Math.min(innerHeight - $w.height(), $w.position().top)),
		});
	};
	
	$w.center = function(){
		$w.css({
			left: (innerWidth - $w.width()) / 2,
			top: (innerHeight - $w.height()) / 2,
		});
		$w.applyBounds();
	};
	
	
	$G.on("resize", $w.applyBounds);
	
	var drag_offset_x, drag_offset_y;
	var drag = function(e){
		$w.css({
			left: e.clientX - drag_offset_x,
			top: e.clientY - drag_offset_y,
		});
	};
	$w.$titlebar.attr("touch-action", "none");
	$w.$titlebar.on("mousedown selectstart", function(e){
		e.preventDefault();
	});
	$w.$titlebar.on("pointerdown", function(e){
		if($(e.target).is("button")){
			return;
		}
		drag_offset_x = e.clientX - $w.position().left;
		drag_offset_y = e.clientY - $w.position().top;
		$G.on("pointermove", drag);
	});
	$G.on("pointerup", function(e){
		$G.off("pointermove", drag);
	});
	$w.$titlebar.on("dblclick", function(e){
		if($component){
			$component.dock();
		}
	});
	
	$w.$Button = function(text, handler){
		var $b = $(E("button"))
			.appendTo($w.$content)
			.text(text)
			.on("click", function(){
				if(handler){
					handler();
				}
				$w.close();
			});
		return $b;
	};
	$w.title = function(title){
		if(title !== undefined){
			$w.$title.text(title);
			$w.triggerHandler("title-change");
			return $w;
		}else{
			return $w.$title.text();
		}
	};
	$w.setIconByID = function(icon_name){
		// $w.$icon.attr("src", getIconPath(icon_name));
		var old_$icon = $w.$icon;
		$w.$icon = $Icon(icon_name, TITLEBAR_ICON_SIZE);
		old_$icon.replaceWith($w.$icon);
		$w.triggerHandler("icon-change");
		return $w;
	};
	$w.close = function(force){
		if(!force){
			var e = $.Event("close");
			$w.trigger(e);
			if(e.isDefaultPrevented()){
				return;
			}
		}
		if($component){
			$component.detach();
		}
		$w.remove();
		$w.closed = true;
		$w.trigger("closed");
		// TODO: change usages of "close" to "closed" where appropriate
		// and probably rename the "close" event
	};
	$w.closed = false;
	
	if(options.title){
		$w.title(options.title);
	}
	
	if(!$component){
		$w.center();
	}
	
	return $w;
}

function $FormWindow(title){
	var $w = new $Window();
	
	$w.title(title);
	$w.$form = $(E("form")).appendTo($w.$content);
	$w.$main = $(E("div")).appendTo($w.$form);
	$w.$buttons = $(E("div")).appendTo($w.$form).addClass("button-group");
	
	$w.$Button = function(label, action){
		var $b = $(E("button")).appendTo($w.$buttons).text(label);
		$b.on("click", function(e){
			// prevent the form from submitting
			// @TODO: instead, prevent the form's submit event
			e.preventDefault();
			
			action();
		});
		
		$b.on("pointerdown", function(){
			$b.focus();
		});
		
		return $b;
	};
	
	return $w;
};
