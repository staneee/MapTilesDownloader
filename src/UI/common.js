/** 经纬点位 */
function LngLat(lng, lat) {
    this.lng = lng;
    this.lat = lat;
}

/** 矩形经纬度边框坐标 */
function LngLatBounds(southWest, northEast) {
    this._sw = {
        ...southWest
    };
    this._ne = {
        ...northEast
    };
}

/** 获取左边，左、下、右、上 */
LngLatBounds.prototype.getArray = function () {
    return [
        this._sw.lng,
        this._sw.lat,
        this._ne.lng,
        this._ne.lat
    ]
}
/** 西南经纬度 */
LngLatBounds.prototype.getSouthWest = function () {
    return {
        ...this._sw
    };
}
/** 东北经纬度 */
LngLatBounds.prototype.getNorthEast = function () {
    return {
        ...this._ne
    };
}
/** 获取中心经纬度 */
LngLatBounds.prototype.getCenter = function () {
    const lb = this.getSouthWest();
    const rt = this.getNorthEast();

    const lng = rt.lng - lb.lng;
    const lat = rt.lat - lb.lat;

    return {
        lng: lb.lng + lng,
        lat: lb.lat + lat
    }
}