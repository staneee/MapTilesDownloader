const { createApp } = Vue

const tileServerDict = {
	"Open Street Maps": "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
	"Open Cycle Maps": "http://a.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png",
	"Open PT Transport": "http://openptmap.org/tiles/{z}/{x}/{y}.png",

	"Bing Maps": "http://ecn.t0.tiles.virtualearth.net/tiles/r{quad}.jpeg?g=129&mkt=en&stl=H",
	"Bing Maps Satellite": "http://ecn.t0.tiles.virtualearth.net/tiles/a{quad}.jpeg?g=129&mkt=en&stl=H",
	"Bing Maps Hybrid": "http://ecn.t0.tiles.virtualearth.net/tiles/h{quad}.jpeg?g=129&mkt=en&stl=H",

	"Google Maps": "https://mt0.google.com/vt?lyrs=m&x={x}&s=&y={y}&z={z}",
	"Google Maps Satellite": "https://mt0.google.com/vt?lyrs=s&x={x}&s=&y={y}&z={z}",
	"Google Maps Hybrid": "https://mt0.google.com/vt?lyrs=h&x={x}&s=&y={y}&z={z}",
	"Google Maps Terrain": "https://mt0.google.com/vt?lyrs=p&x={x}&s=&y={y}&z={z}",

	"ESRI World Imagery": "http://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
	"Wikimedia Maps": "https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png",
	"NASA GIBS": "https://map1.vis.earthdata.nasa.gov/wmts-webmerc/MODIS_Terra_CorrectedReflectance_TrueColor/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",

	"Carto Light": "http://cartodb-basemaps-c.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
	"Stamen Toner B&W": "http://a.tile.stamen.com/toner/{z}/{x}/{y}.png",
}


createApp({
	data() {
		return {
			mapViewInstace: null,
			tileServerInstace: null,
			tileServerDict: {
				...tileServerDict
			},
			zoomList: [],
			selectedTileServer: tileServerDict['Open Street Maps'],
			zoomFrom: 15,
			zoomTo: 15,
			outputScale: 1,
			outputType: 'directory',
			outputFile: '{z}/{x}/{y}.png',
			parallelThreads: 4,
			requests: [],
			cancellationToken: false
		}
	},
	mounted() {
		for (let i = 0; i < 21; i++) {
			this.zoomList.push(i);
		}
		this.initMap();
	},
	methods: {
		/** 下载 */
		async startDownloading() {
			const { getBounds, getMinZoom, getMaxZoom, getAllGridTiles, generateQuadKey } = this;

			const bounds = getBounds();
			if (!bounds) {
				alert("You need to select a region first!");
			}


			// 缩放等级
			const minZoom = getMinZoom();
			const maxZoom = getMaxZoom();

			// 当前时间卓
			const timestamp = Date.now().toString();

			// 所有tile
			const allTiles = getAllGridTiles();

			// 下载配置
			const numThreads = this.parallelThreads;
			const outputDirectory = '';
			const outputFile = this.outputFile;
			const outputType = this.outputType;
			const outputScale = this.outputScale;
			const source = this.selectedTileServer;

			// 范围
			const boundCenter = bounds.getCenter();
			const boundsArray = bounds.getArray();
			const centerArray = [boundCenter.lng, boundCenter.lat, maxZoom];

			const data = new FormData();
			data.append('minZoom', minZoom)
			data.append('maxZoom', maxZoom)
			data.append('outputDirectory', outputDirectory)
			data.append('outputFile', outputFile)
			data.append('outputType', outputType)
			data.append('outputScale', outputScale)
			data.append('source', source)
			data.append('timestamp', timestamp)
			data.append('bounds', boundsArray.join(","))
			data.append('center', centerArray.join(","))

			var request = await $.ajax({
				url: "/start-download",
				async: true,
				timeout: 30 * 1000,
				type: "post",
				contentType: false,
				processData: false,
				data: data,
				dataType: 'json',
			})


			let i = 0;
			var iterator = async.eachLimit(allTiles, numThreads, function (item, done) {

				if (cancellationToken) {
					return;
				}

				// var boxLayer = previewRect(item);

				var url = "/download-tile";

				var data = new FormData();
				data.append('x', item.x)
				data.append('y', item.y)
				data.append('z', item.z)
				data.append('quad', generateQuadKey(item.x, item.y, item.z))
				data.append('outputDirectory', outputDirectory)
				data.append('outputFile', outputFile)
				data.append('outputType', outputType)
				data.append('outputScale', outputScale)
				data.append('timestamp', timestamp)
				data.append('source', source)
				data.append('bounds', boundsArray.join(","))
				data.append('center', centerArray.join(","))


				var request = $.ajax({
					"url": url,
					async: true,
					timeout: 30 * 1000,
					type: "post",
					contentType: false,
					processData: false,
					data: data,
					dataType: 'json',
				}).done(function (data) {

					if (cancellationToken) {
						return;
					}

					if (data.code == 200) {
						showTinyTile(data.image)
						logItem(item.x, item.y, item.z, data.message);
					} else {
						logItem(item.x, item.y, item.z, data.code + " Error downloading tile");
					}

				}).fail(function (data, textStatus, errorThrown) {

					if (cancellationToken) {
						return;
					}

					logItem(item.x, item.y, item.z, "Error while relaying tile");
					//allTiles.push(item);

				}).always(function (data) {
					i++;

					// removeLayer(boxLayer);
					// updateProgress(i, allTiles.length);

					done();

					if (cancellationToken) {
						return;
					}
				});

				requests.push(request);

			}, async function (err) {


				var request = await $.ajax({
					url: "/end-download",
					async: true,
					timeout: 30 * 1000,
					type: "post",
					contentType: false,
					processData: false,
					data: data,
					dataType: 'json',
				})

				updateProgress(allTiles.length, allTiles.length);
				logItemRaw("All requests are done");

				// $("#stop-button").html("FINISH");
			});
		},
		/** 停止 */
		stopDownloading() {
			this.cancellationToken = true;

			for (var i = 0; i < this.requests.length; i++) {
				var request = this.requests[i];
				try {
					request.abort();
				} catch (e) {

				}
			}

			// $("#main-sidebar").show();
			// $("#download-sidebar").hide();
			// removeGrid();
			// clearLogs();
		},
		/**  */
		getGrid(zoomLevel) {
			const { getTileRect, isTileInSelection } = this;
			const bounds = this.getBounds();

			const rects = [];

			var thisZoom = zoomLevel;

			const ne = bounds.getNorthEast();
			const sw = bounds.getSouthWest();

			const TY = this.lat2tile(ne.lat, thisZoom);
			const LX = this.long2tile(sw.lng, thisZoom);
			const BY = this.lat2tile(sw.lat, thisZoom);
			const RX = this.long2tile(ne.lng, thisZoom);

			for (let y = TY; y <= BY; y++) {
				for (let x = LX; x <= RX; x++) {

					let rect = getTileRect(x, y, thisZoom);

					if (isTileInSelection(rect)) {
						rects.push({
							x: x,
							y: y,
							z: thisZoom,
							rect: rect,
						});
					}

				}
			}

			return rects;
		},
		/** 获取划定的边框，左，下，右，上 */
		getBounds() {
			// 获取划定范围的层
			const rectangleLayerList = [];
			for (const layer of Object.values(this.mapViewInstace._layers)) {
				if (!layer._latlngs) {
					continue;
				}

				rectangleLayerList.push(layer._latlngs[0]);
			}

			// 获取层数里面的点数
			const rectangleLatLngPoints = [];
			for (const rectangleLatLngPointList of rectangleLayerList) {
				for (const rectangleLatLngPoint of rectangleLatLngPointList) {
					if (rectangleLatLngPoint == null) {
						continue;
					}
					rectangleLatLngPoints.push(rectangleLatLngPoint);
				}
			}

			// 如果没有4个点位，那么返回空
			if (rectangleLatLngPoints.length !== 4) {
				return null;
			}


			// 左下，右上
			const firstPoint = rectangleLatLngPoints[0];
			const southWest = new LngLat(firstPoint.lng, firstPoint.lat);
			const northEast = new LngLat(firstPoint.lng, firstPoint.lat);
			for (const point of rectangleLatLngPoints) {
				// 左经度
				southWest.lng = Math.min(point.lng, southWest.lng)
				// 下纬度
				southWest.lat = Math.min(point.lat, southWest.lat)

				// 右经度
				northEast.lng = Math.max(point.lng, northEast.lng)
				// 上纬度
				northEast.lat = Math.max(point.lat, northEast.lat)
			}

			return new LngLatBounds(southWest, northEast);
		},
		/** 计算tile矩形 */
		getTileRect(x, y, zoom) {
			const { tile2long, tile2lat } = this;

			var c1 = new LngLat(tile2long(x, zoom), tile2lat(y, zoom));
			var c2 = new LngLat(tile2long(x + 1, zoom), tile2lat(y + 1, zoom));

			const result = new LngLatBounds(c1, c2);
			return result;
		},
		/** tile是否在选中范围内 */
		isTileInSelection(tileRect) {
			const { getPolygonByBounds, getBounds } = this;

			// tile范围
			var polygon = getPolygonByBounds(tileRect);

			// 当前选中范围
			// var areaPolygon = draw.getAll().features[0];
			var areaPolygon = getPolygonByBounds(getBounds());


			if (turf.booleanDisjoint(polygon, areaPolygon) == false) {
				return true;
			}

			return false;
		},
		/** 获取多边形边框 */
		getPolygonByBounds(bounds) {
			const { getArrayByBounds } = this;
			var tilePolygonData = getArrayByBounds(bounds);

			var polygon = turf.polygon([tilePolygonData]);

			return polygon;
		},
		/** 根据边框获取tile集合 */
		getArrayByBounds(bounds) {

			var tileArray = [
				[bounds.getSouthWest().lng, bounds.getNorthEast().lat],
				[bounds.getNorthEast().lng, bounds.getNorthEast().lat],
				[bounds.getNorthEast().lng, bounds.getSouthWest().lat],
				[bounds.getSouthWest().lng, bounds.getSouthWest().lat],
				[bounds.getSouthWest().lng, bounds.getNorthEast().lat],
			];

			return tileArray;
		},
		/** 获取最小缩放 */
		getMinZoom() {
			return Math.min(parseInt(this.zoomFrom), parseInt(this.zoomTo))
		},
		/** 获取最大缩放 */
		getMaxZoom() {
			return Math.max(parseInt(this.zoomFrom), parseInt(this.zoomTo))
		},
		/** 纬度转tile */
		lat2tile(lat, zoom) {
			return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
		},
		/** tile转纬度 */
		tile2lat(y, z) {
			var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
			return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
		},
		/** 经度转tile */
		long2tile(lon, zoom) {
			return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
		},
		/** tile转经度 */
		tile2long(x, z) {
			return (x / Math.pow(2, z) * 360 - 180);
		},
		/** 获取所有的tile */
		getAllGridTiles() {

			const minZoom = this.getMinZoom();
			const maxZoom = this.getMaxZoom();

			let allTiles = [];

			for (let z = minZoom; z <= maxZoom; z++) {
				const grid = this.getGrid(z);
				// TODO shuffle grid via a heuristic (hamlet curve? :/)
				allTiles = allTiles.concat(grid);
			}

			return allTiles;
		},
		/** 生成QuadKey */
		generateQuadKey(x, y, z) {
			var quadKey = [];
			for (var i = z; i > 0; i--) {
				var digit = '0';
				var mask = 1 << (i - 1);
				if ((x & mask) != 0) {
					digit++;
				}
				if ((y & mask) != 0) {
					digit++;
					digit++;
				}
				quadKey.push(digit);
			}
			return quadKey.join('');
		},
		/** 设置设备数据大小 */
		initMap() {

			// 图层
			this.tileServerInstace = L.tileLayer(
				'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				}
			);

			// 地图实例
			this.mapViewInstace = L.map('map-view')
				.setView([31, 121], 13)
				.addLayer(this.tileServerInstace);

			// 地图扩展
			// https://www.geoman.io/docs/toolbar
			this.mapViewInstace.pm.addControls({
				position: 'topleft',
				drawMarker: false,
				drawCircleMarker: false,
				drawPolyline: false,
				drawRectangle: true,
				drawPolygon: false,
				drawCircle: false,
				drawText: false,
				editMode: false,
				dragMode: false,
				cutPolygon: false,
				removalMode: true,
				rotateMode: false,
				oneBlock: false,
				drawControls: true,
				editControls: true,
				customControls: false,
				optionsControls: false,
				pinningOption: false,
				snappingOption: false,
				splitMode: false,
				scaleMode: false,
				autoTracingOption: false
			});
		},
	}
}).mount('#app')