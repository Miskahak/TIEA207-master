var types = require('./testprotocol_pb');
export class WSHandler {
	constructor(hostname, open = null, error = null) {
		this.ws = new WebSocket(hostname);
		this.ws.binaryType = "arraybuffer";
		this.onChatMessage = new Set();
		this.onLocationChange = new Set();
		this.onReceiveDrawing = new Set();

		this.onLoginResult = new Set();
		this.onJoinResult = new Set();
		this.onNewGroup = new Set();
		this.onEditGroup = new Set();
		this.onUserMoved = new Set();
		var me = this;

		this.ws.onmessage = function(evnt) {
			me.onMessage(evnt)};
		if (open !== null)
			this.ws.onopen = open;
		if (error !== null)
			this.ws.onerror = error;
	}

	sendLocation(lat, lon, acc) {
		var msg = new proto.testi.ToServer();
		var loc = new proto.testi.Location();
		loc.setLatitude(lat);
		loc.setLongitude(lon);
		loc.setAccuracy(acc);
		msg.setLocation(loc);
		this.ws.send(msg.serializeBinary());
	}

	sendCircle(center, radius, fillcolor, strokecolor,width) {

		var circle = new proto.testi.Circle();
		var point = new proto.testi.DrawPoint();
		var fill = new proto.testi.Fill();
		var stroke = new proto.testi.Stroke();
		point.setLongitude(center[0]);
		point.setLatitude(center[1]);
		circle.setCenter(point);
		circle.setRadius(radius);
		fill.setColor(fillcolor);
		stroke.setColor(strokecolor);
		stroke.setWidth(width);
		circle.setFill(fill);
		circle.setStroke(stroke);
		var shape = new proto.testi.DrawShape();
		shape.getCirclesList().push(circle);
		var msg = new proto.testi.ToServer();
		msg.setShape(shape);
		//msg.setFill(fill);
		//msg.setStroke(stroke);
		//kaatuu seuraavassa
		this.ws.send(msg.serializeBinary());
	}

	sendPolygon(poly,fillcolor,strokecolor,width) {
		var polygon = new proto.testi.Polygon();
		var fill = new proto.testi.Fill();
		var stroke = new proto.testi.Stroke();
		stroke.setColor(strokecolor);
		stroke.setWidth(width);
		fill.setColor(fillcolor);
		polygon.setFill(fill);
		polygon.setStroke(stroke);
		poly.forEach(arr=>{
			var points = new proto.testi.PointArray();
			arr.forEach(p=>{
				var point = new proto.testi.DrawPoint();
				point.setLongitude(p[0]);
				point.setLatitude(p[1]);
				points.getPointsList().push(point);
			});
			polygon.getPointarrayList().push(points);
		});
		var msg = new proto.testi.ToServer();
		var shape = new proto.testi.DrawShape();
		shape.getPolysList().push(polygon);
		msg.setShape(shape);
		this.ws.send(msg.serializeBinary());
	}

	sendLinestring(array,strokeColor,width) {
		var msg = new proto.testi.ToServer();
		var shape = new proto.testi.DrawShape();
		var points = new proto.testi.PointArray();
		var stroke = new proto.testi.Stroke();
		stroke.setColor(strokeColor);
		stroke.setWidth(width);
		array.forEach(e=>{
			var point = new proto.testi.DrawPoint();
			point.setLongitude(e[0]);
			point.setLatitude(e[1]);
			points.getPointsList().push(point);
		});
		var linestring = new proto.testi.Linestring();
		linestring.setPointarray(points);
		linestring.setStroke(stroke);
		shape.getLinestringsList().push(linestring);
		msg.setShape(shape);
		this.ws.send(msg.serializeBinary());
	}


	sendDeleteDrawing(ids){
		var msg = new proto.testi.ToServer();
		var shape = new proto.testi.DrawShape();
		
		if(ids.constructor == Array){
			shape.setDeleteidsList(ids);	
		} 
		else{
			shape.getDeleteidsList().push(ids);
		}
		msg.setShape(shape);
		this.ws.send(msg.serializeBinary());
	}


	sendChatMessage(msg) {
		var resp = new proto.testi.ToServer();
		resp.setChatmsg(msg);
		this.ws.send(resp.serializeBinary());
	}

	joinRoom(room, password, create){	// room ja password stringejä, create boolean
		var msg = new proto.testi.ToServer();
		var join = new proto.testi.JoinRoom();
		join.setRoomname(room);
		join.setPassword(password);
		if (create === true)
			join.setCreateroom(true);
		else join.setCreateroom(false);
		msg.setJoinroom(join);
		this.ws.send(msg.serializeBinary());
	}

	login(username, key) {
		var msg = new proto.testi.ToServer();
		var logininfo = new proto.testi.SendLoginInfo();
		logininfo.setUsername(username);
		if (key !== undefined) {
			logininfo.setKey(key);
		} else key = "";
		msg.setLogininfo(logininfo);
		this.ws.send(msg.serializeBinary());
	}

	createGroup(name) {
		var msg = new proto.testi.ToServer();
		var group = new proto.testi.CreateGroup();
		group.setName(name);
		msg.setCreategroup(group);
		this.ws.send(msg.serializeBinary());
	}

	joinGroup(groupid) {
		var msg = new proto.testi.ToServer();
		var group = new proto.testi.JoinGroup();
		group.setId(groupid);
		msg.setJoingroup(group);
		this.ws.send(msg.serializeBinary());
	}
    
    deleteGroup(groupid) {
        var msg = new proto.testi.ToServer();
		var group = new proto.testi.EditGroup();
		group.setId(groupid);
        group.setDelete(true);
        msg.setEditgroup(group);
		this.ws.send(msg.serializeBinary());
    }

	editGroup(groupid, name = null, usercolor = null) {
		var msg = new proto.testi.ToServer();
		var group = new proto.testi.EditGroup();
		group.setId(groupid);
		if (name != null) {
			group.setName(name);
		}
		if (usercolor != null) {
			group.setUsercolor(usercolor);
		}
		msg.setEditgroup(group);
		this.ws.send(msg.serializeBinary());
	}

	onMessage(evnt) {
		var msg = proto.testi.FromServer.deserializeBinary(evnt.data);
		var err = msg.getErrmsg();
		if (err !== "")
			console.log(err);

		var that = this;
		if (msg.hasLoginanswer()) {
			this.onLoginResult.forEach(f=>f(msg.getLoginanswer()));
		}
		if (msg.hasJoinanswer()) {
			this.onJoinResult.forEach(f=>f(msg.getJoinanswer()));
		}
		msg.getNewgroupsList().forEach(e=>that.onNewGroup.forEach(f=>f(e)));
		msg.getEditgroupsList().forEach(e=>that.onEditGroup.forEach(f=>f(e)));
		msg.getUsermovedList().forEach(e=>that.onUserMoved.forEach(f=>f(e)));
		msg.getChatmsgList().forEach(e=>that.onChatMessage.forEach(f=>f(e)));
		msg.getLocationsList().forEach(e=>that.onLocationChange.forEach(f=>f(e)));
		msg.getShapesList().forEach(e=>that.onReceiveDrawing.forEach(f=>f(e)));
	}


	addLocationChangeListener(func) {
		this.onLocationChange.add(func);
	}
	removeLocationChangeListener(func) {
		this.onLocationChange.delete(func);
	}
	addReceiveDrawingListener(func) {
		this.onReceiveDrawing.add(func);
	}
	removeReceiveDrawingListener(func) {
		this.onReceiveDrawing.delete(func);
	}
	addChatMessageListener(func) {
		this.onChatMessage.add(func);
	}
	removeChatMessageListener(func) {
		this.onChatMessage.delete(func);
	}
	addLoginResultListener(func) {
		this.onLoginResult.add(func);
	}
	removeLoginResultListener(func) {
		this.onLoginResult.delete(func);
	}
	addJoinResultListener(func) {
		this.onJoinResult.add(func);
	}
	removeJoinResultListener(func) {
		this.onJoinResult.delete(func);
	}
	addNewGroupListener(func) {
		this.onNewGroup.add(func);
	}
	removeNewGroupListener(func) {
		this.onNewGroup.delete(func);
	}
	addEditGroupListener(func) {
		this.onEditGroup.add(func);
	}
	removeEditGroupListener(func) {
		this.onEditGroup.delete(func);
	}
	addUserMovedListener(func) {
		this.onUserMoved.add(func);
	}
	removeUserMovedListener(func) {
		this.onUserMoved.delete(func);
	}
}


