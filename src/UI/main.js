// var mapView;

$(function () {

	const tileServer = L.tileLayer(
		'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		{
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}
	);
	const mapView = L.map('map-view')
		.setView([51.505, -0.09], 13)
		.addLayer(tileServer);

	// https://www.geoman.io/docs/toolbar
	mapView.pm.addControls({
		position: 'topleft',
		// drawMarker: false,
		// drawCircleMarker: false,
		// drawPolyline: false,
		// drawRectangle: true,
		// drawPolygon: false,
		// drawCircle: false,
		// drawText: false,
		// editMode: true,
		// dragMode: false,
		// cutPolygon: false,
		// removalMode: false,
		// rotateMode: false,
		// oneBlock: false,
		// drawControls: false,
		// editControls: false,
		// customControls: false,
		// optionsControls: true,
		// pinningOption: false,
		// snappingOption: false,
		// splitMode: false,
		// scaleMode: false,
		// autoTracingOption: false
	});
});