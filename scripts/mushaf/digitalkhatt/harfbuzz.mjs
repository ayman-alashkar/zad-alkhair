/* Copied from DigitalKhatt (https://github.com/DigitalKhatt/digitalkhatt-js,
   apps/site-angular/src/app/components/hbmedina/harfbuzz.ts), MIT License (itself copied from harfbuzzjs, Old MIT) — see LICENSE here.
   Transpiled from TypeScript with esbuild; changes for Zad Al-Khair's build are marked «زاد». */
import createHarfBuzz from "../vendor/harfbuzzjs/harfbuzz.mjs";
const HB_MEMORY_MODE_WRITABLE = 2;
const HB_SET_VALUE_INVALID = -1;
class HarfBuzzExports {
  constructor(module) {
    this.module = module;
    this.addFunction = module.addFunction;
    this.freeFuncPtr = this.addFunction(function(ptr) {
      exports.free(ptr);
    }, "vi");
    this.exports = module.wasmExports;
    const exports = this.exports;
    this.heapu8 = new Uint8Array(exports.memory.buffer);
    this.heapu32 = new Uint32Array(exports.memory.buffer);
    this.heapi32 = new Int32Array(exports.memory.buffer);
    this.utf8Encoder = new TextEncoder();
    this.malloc = exports.malloc;
    this.free = exports.free;
    this.free_ptr = exports.free_ptr;
    this.hb_blob_destroy = exports.hb_blob_destroy;
    this.hb_blob_create = exports.hb_blob_create;
    this.hb_face_create = exports.hb_face_create;
    this.hb_face_get_upem = exports.hb_face_get_upem;
    this.hb_face_destroy = exports.hb_face_destroy;
    this.hb_face_collect_unicodes = exports.hb_face_collect_unicodes;
    this.hb_set_create = exports.hb_set_create;
    this.hb_set_destroy = exports.hb_set_destroy;
    this.hb_set_get_population = exports.hb_set_get_population;
    this.hb_set_next_many = exports.hb_set_next_many;
    this.hb_font_create = exports.hb_font_create;
    this.hb_font_set_scale = exports.hb_font_set_scale;
    this.hb_font_destroy = exports.hb_font_destroy;
    this.hb_buffer_create = exports.hb_buffer_create;
    this.hb_buffer_add_utf8 = exports.hb_buffer_add_utf8;
    this.hb_buffer_guess_segment_properties = exports.hb_buffer_guess_segment_properties;
    this.hb_buffer_set_direction = exports.hb_buffer_set_direction;
    this.hb_shape = exports.hb_shape;
    this.hb_buffer_get_length = exports.hb_buffer_get_length;
    this.hb_buffer_get_glyph_infos = exports.hb_buffer_get_glyph_infos;
    this.hb_buffer_get_glyph_positions = exports.hb_buffer_get_glyph_positions;
    this.hb_buffer_destroy = exports.hb_buffer_destroy;
    let str = this.createAsciiString("Arab");
    this.arabScript = this.exports.hb_script_from_string(str.ptr, -1);
    str.free();
    str = this.createAsciiString("ar");
    this.arabLanguage = this.exports.hb_language_from_string(str.ptr, -1);
    str.free();
    this.pathBuffer = this.malloc(this.pathBufferSize);
  }
  module;
  heapu8;
  heapu32;
  heapi32;
  utf8Encoder;
  //exported HarfBuzz methods
  malloc;
  free;
  free_ptr;
  hb_blob_create;
  hb_blob_destroy;
  hb_face_create;
  hb_face_get_upem;
  hb_face_destroy;
  hb_font_create;
  hb_font_set_scale;
  hb_font_destroy;
  hb_face_collect_unicodes;
  hb_set_create;
  hb_set_destroy;
  hb_set_get_population;
  hb_set_next_many;
  hb_buffer_create;
  hb_buffer_add_utf8;
  hb_buffer_guess_segment_properties;
  hb_buffer_set_direction;
  hb_shape;
  hb_buffer_get_length;
  hb_buffer_get_glyph_infos;
  hb_buffer_get_glyph_positions;
  hb_buffer_destroy;
  arabScript;
  arabLanguage;
  pathBufferSize = 65536;
  // should be enough for most glyphs
  pathBuffer;
  utf8Decoder = new TextDecoder("utf8");
  exports;
  addFunction;
  freeFuncPtr;
  createAsciiString(text) {
    var ptr = this.malloc(text.length + 1);
    for (let i = 0; i < text.length; ++i) {
      const char = text.charCodeAt(i);
      if (char > 127) throw new Error("Expected ASCII text");
      this.heapu8[ptr + i] = char;
    }
    this.heapu8[ptr + text.length] = 0;
    return {
      ptr,
      length: text.length,
      free: () => {
        this.free(ptr);
      }
    };
  }
  createJsString(text) {
    const ptr = this.exports.malloc(text.length * 2);
    const words = new Uint16Array(this.exports.memory.buffer, ptr, text.length);
    for (let i = 0; i < words.length; ++i) words[i] = text.charCodeAt(i);
    return {
      ptr,
      length: words.length,
      free: () => {
        this.exports.free(ptr);
      }
    };
  }
  createFeatures(features) {
    if (!features?.length) {
      return {
        ptr: 0,
        length: 0,
        free: () => {
        }
      };
    }
    const ptr = this.exports.malloc(16 * features.length);
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      this.heapu32[ptr / 4 + i * 4 + 0] = hb_tag(feature.tag);
      this.heapu32[ptr / 4 + i * 4 + 1] = feature.value;
      this.heapu32[ptr / 4 + i * 4 + 2] = feature.start;
      this.heapu32[ptr / 4 + i * 4 + 3] = feature.end;
    }
    return {
      ptr,
      length: features.length,
      free: () => {
        this.exports.free(ptr);
      }
    };
  }
}
let hb;
class CString {
  ptr;
  length;
  constructor(text) {
    var bytes = hb.utf8Encoder.encode(text);
    this.ptr = hb.malloc(bytes.byteLength);
    hb.heapu8.set(bytes, this.ptr);
    this.length = bytes.byteLength;
  }
  destroy() {
    hb.free(this.ptr);
  }
}
class HarfBuzzBlob {
  ptr;
  constructor(data) {
    let blobPtr = hb.malloc(data.length);
    hb.heapu8.set(data, blobPtr);
    this.ptr = hb.hb_blob_create(blobPtr, data.byteLength, HB_MEMORY_MODE_WRITABLE, blobPtr, hb.freeFuncPtr);
  }
  destroy() {
    hb.hb_blob_destroy(this.ptr);
  }
}
function typedArrayFromSet(setPtr, arrayType) {
  const heap = hb[`heap${arrayType}`];
  const bytesPerElment = heap.BYTES_PER_ELEMENT;
  const setCount = hb.hb_set_get_population(setPtr);
  const arrayPtr = hb.malloc(
    setCount * bytesPerElment
  );
  const arrayOffset = arrayPtr / bytesPerElment;
  const array = heap.subarray(
    arrayOffset,
    arrayOffset + setCount
  );
  heap.set(array, arrayOffset);
  hb.hb_set_next_many(
    setPtr,
    HB_SET_VALUE_INVALID,
    arrayPtr,
    setCount
  );
  return array;
}
class HarfBuzzFace {
  ptr;
  constructor(blob, index) {
    this.ptr = hb.hb_face_create(blob.ptr, index);
  }
  getUnitsPerEM() {
    return hb.hb_face_get_upem(this.ptr);
  }
  collectUnicodes() {
    const unicodeSetPtr = hb.hb_set_create();
    hb.hb_face_collect_unicodes(this.ptr, unicodeSetPtr);
    const result = typedArrayFromSet(unicodeSetPtr, "u32");
    hb.hb_set_destroy(unicodeSetPtr);
    return result;
  }
  destroy() {
    hb.hb_face_destroy(this.ptr);
  }
}
class HarfBuzzFont {
  ptr;
  unitsPerEM;
  drawFuncsPtr = null;
  pathBuffer = "";
  constructor(face) {
    this.ptr = hb.hb_font_create(face.ptr);
    this.unitsPerEM = face.getUnitsPerEM();
    this.initilizeDraw();
  }
  setScale(xScale, yScale) {
    hb.hb_font_set_scale(this.ptr, xScale, yScale);
  }
  glyphToSvgPath(glyphId) {
    this.pathBuffer = "";
    hb.exports.hb_font_draw_glyph(this.ptr, glyphId, this.drawFuncsPtr, 0);
    return this.pathBuffer;
  }
  initilizeDraw() {
    var moveTo = (dfuncs, draw_data, draw_state, to_x, to_y, user_data) => {
      this.pathBuffer += `M${to_x},${to_y}`;
    };
    var lineTo = (dfuncs, draw_data, draw_state, to_x, to_y, user_data) => {
      this.pathBuffer += `L${to_x},${to_y}`;
    };
    var cubicTo = (dfuncs, draw_data, draw_state, c1_x, c1_y, c2_x, c2_y, to_x, to_y, user_data) => {
      this.pathBuffer += `C${c1_x},${c1_y} ${c2_x},${c2_y} ${to_x},${to_y}`;
    };
    var quadTo = (dfuncs, draw_data, draw_state, c_x, c_y, to_x, to_y, user_data) => {
      this.pathBuffer += `Q${c_x},${c_y} ${to_x},${to_y}`;
    };
    var closePath = (dfuncs, draw_data, draw_state, user_data) => {
      this.pathBuffer += "Z";
    };
    var moveToPtr = hb.addFunction(moveTo, "viiiffi");
    var lineToPtr = hb.addFunction(lineTo, "viiiffi");
    var cubicToPtr = hb.addFunction(cubicTo, "viiiffffffi");
    var quadToPtr = hb.addFunction(quadTo, "viiiffffi");
    var closePathPtr = hb.addFunction(closePath, "viiii");
    this.drawFuncsPtr = hb.exports.hb_draw_funcs_create();
    hb.exports.hb_draw_funcs_set_move_to_func(this.drawFuncsPtr, moveToPtr, 0, 0);
    hb.exports.hb_draw_funcs_set_line_to_func(this.drawFuncsPtr, lineToPtr, 0, 0);
    hb.exports.hb_draw_funcs_set_cubic_to_func(this.drawFuncsPtr, cubicToPtr, 0, 0);
    hb.exports.hb_draw_funcs_set_quadratic_to_func(this.drawFuncsPtr, quadToPtr, 0, 0);
    hb.exports.hb_draw_funcs_set_close_path_func(this.drawFuncsPtr, closePathPtr, 0, 0);
  }
  destroy() {
    hb.hb_font_destroy(this.ptr);
  }
}
class GlyphInformation {
  GlyphId;
  Cluster;
  XAdvance;
  YAdvance;
  XOffset;
  YOffset;
  constructor(glyphId, cluster, xAdvance, yAdvance, xOffset, yOffset) {
    this.GlyphId = glyphId;
    this.Cluster = cluster;
    this.XAdvance = xAdvance;
    this.YAdvance = yAdvance;
    this.XOffset = xOffset;
    this.YOffset = yOffset;
  }
}
class HarfBuzzBuffer {
  ptr;
  constructor() {
    this.ptr = hb.hb_buffer_create();
  }
  addUtf8Text(text) {
    let str = new CString(text);
    hb.hb_buffer_add_utf8(this.ptr, str.ptr, str.length, 0, str.length);
    str.destroy();
  }
  addText(text) {
    const str = hb.createJsString(text);
    hb.exports.hb_buffer_add_utf16(this.ptr, str.ptr, str.length, 0, str.length);
    str.free();
  }
  guessSegmentProperties() {
    hb.hb_buffer_guess_segment_properties(this.ptr);
  }
  setDirection(direction) {
    let d = { "ltr": 4, "rtl": 5, "ttb": 6, "btt": 7 }[direction];
    hb.hb_buffer_set_direction(this.ptr, d);
  }
  setLanguageFromString(language) {
    var str = hb.createAsciiString(language);
    hb.exports.hb_buffer_set_language(this.ptr, hb.exports.hb_language_from_string(str.ptr, -1));
    str.free();
  }
  setScriptFromString(script) {
    var str = hb.createAsciiString(script);
    hb.exports.hb_buffer_set_script(this.ptr, hb.exports.hb_script_from_string(str.ptr, -1));
    str.free();
  }
  setLanguage(language) {
    hb.exports.hb_buffer_set_language(this.ptr, language);
  }
  setScript(script) {
    hb.exports.hb_buffer_set_script(this.ptr, script);
  }
  setClusterLevel(level) {
    hb.exports.hb_buffer_set_cluster_level(this.ptr, level);
  }
  shape(font, features) {
    let feats = hb.createFeatures(features);
    hb.hb_shape(font.ptr, this.ptr, feats.ptr, feats.length);
    feats.free();
    return this.json();
  }
  json() {
    var length = hb.hb_buffer_get_length(this.ptr);
    var result = new Array();
    var infosPtr32 = hb.hb_buffer_get_glyph_infos(this.ptr, 0) / 4;
    var positionsPtr32 = hb.hb_buffer_get_glyph_positions(this.ptr, 0) / 4;
    var infos = hb.heapu32.subarray(infosPtr32, infosPtr32 + 5 * length);
    var positions = hb.heapi32.subarray(positionsPtr32, positionsPtr32 + 5 * length);
    for (var i = 0; i < length; ++i) {
      result.push(new GlyphInformation(
        infos[i * 5 + 0],
        infos[i * 5 + 2],
        positions[i * 5 + 0],
        positions[i * 5 + 1],
        positions[i * 5 + 2],
        positions[i * 5 + 3]
      ));
    }
    return result;
  }
  destroy() {
    hb.hb_buffer_destroy(this.ptr);
  }
}
function shape(text, font, features) {
  let buffer = new HarfBuzzBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  buffer.shape(font, features);
  let result = buffer.json();
  buffer.destroy();
  return result;
}
function getWidth(text, font, fontSizeInPixel, features) {
  let scale = fontSizeInPixel / font.unitsPerEM;
  let shapeResult = shape(text, font, features);
  let totalWidth = 0;
  for (let glyphInformation of shapeResult) {
    totalWidth += glyphInformation.XAdvance;
  }
  return totalWidth * scale;
}
const harfbuzzFonts = /* @__PURE__ */ new Map();
function loadHarfbuzz(webAssemblyUrl) {
  return fetch(webAssemblyUrl).then((response) => {
    return response.arrayBuffer();
  }).then((wasm) => {
    const module = { wasmBinary: wasm };
    let tt = hbjs.default(module);
    tt.then((module2) => {
      hb = new HarfBuzzExports(module2);
      console.log(module2);
    });
  });
}
function loadAndCacheFont(fontName, fontUrl) {
  return fetch(fontUrl).then((response) => {
    return response.arrayBuffer().then((blob) => {
      let fontBlob = new Uint8Array(blob);
      let harfbuzzBlob = new HarfBuzzBlob(fontBlob);
      let harfbuzzFace = new HarfBuzzFace(harfbuzzBlob, 0);
      let harfbuzzFont = new HarfBuzzFont(harfbuzzFace);
      harfbuzzFonts.set(fontName, harfbuzzFont);
      harfbuzzFace.destroy();
      harfbuzzBlob.destroy();
    });
  });
}
function hb_tag(s) {
  return (s.charCodeAt(0) & 255) << 24 | (s.charCodeAt(1) & 255) << 16 | (s.charCodeAt(2) & 255) << 8 | (s.charCodeAt(3) & 255) << 0;
}
async function initHb(wasmBinary) {
  const module = await createHarfBuzz({ wasmBinary });
  hb = new HarfBuzzExports(module);
  const ex = hb.exports;
  for (const [k, T] of [["heapu8", Uint8Array], ["heapu32", Uint32Array], ["heapi32", Int32Array]])
    Object.defineProperty(hb, k, { get: () => new T(ex.memory.buffer) });
}
export {
  HarfBuzzBlob,
  HarfBuzzBuffer,
  HarfBuzzFace,
  HarfBuzzFont,
  getWidth,
  harfbuzzFonts,
  hb,
  hb_tag,
  initHb,
  loadAndCacheFont,
  loadHarfbuzz,
  shape
};
