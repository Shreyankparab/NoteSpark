"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateAllStreaks = recalculateAllStreaks;
// utils/recalculateStreaks.ts
var firebaseConfig_1 = require("../firebase/firebaseConfig");
var firestore_1 = require("firebase/firestore");
/**
 * Recalculates the streak for all users based on their activeDays array.
 * activeDays should be an array of strings in YYYY-MM-DD format.
 * The streak is the count of consecutive days ending today.
 */
function recalculateAllStreaks() {
    return __awaiter(this, void 0, void 0, function () {
        var usersCol, snapshot, batch, today, todayStr;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    usersCol = (0, firestore_1.collection)(firebaseConfig_1.db, "users");
                    return [4 /*yield*/, (0, firestore_1.getDocs)(usersCol)];
                case 1:
                    snapshot = _a.sent();
                    batch = (0, firestore_1.writeBatch)(firebaseConfig_1.db);
                    today = new Date();
                    today.setHours(0, 0, 0, 0);
                    todayStr = "".concat(today.getFullYear(), "-").concat(String(today.getMonth() + 1).padStart(2, "0"), "-").concat(String(today.getDate()).padStart(2, "0"));
                    snapshot.forEach(function (userDoc) {
                        var data = userDoc.data();
                        var activeDays = ((data === null || data === void 0 ? void 0 : data.activeDays) || []).sort();
                        // Remove duplicates
                        var uniqueDays = Array.from(new Set(activeDays));
                        // Compute streak ending today (or yesterday if today not present)
                        var streak = 0;
                        var streakStartDate = "";
                        // Start from today and go backwards
                        var cursor = new Date(today);
                        while (true) {
                            var cursorStr = "".concat(cursor.getFullYear(), "-").concat(String(cursor.getMonth() + 1).padStart(2, "0"), "-").concat(String(cursor.getDate()).padStart(2, "0"));
                            if (uniqueDays.includes(cursorStr)) {
                                streak++;
                                if (streak === 1) {
                                    streakStartDate = cursorStr; // will be overwritten later to earliest day
                                }
                                // move back one day
                                cursor.setDate(cursor.getDate() - 1);
                            }
                            else {
                                break;
                            }
                        }
                        // If streak > 0, find the earliest day in the consecutive block
                        if (streak > 0) {
                            var start = new Date(today);
                            start.setDate(start.getDate() - (streak - 1));
                            streakStartDate = "".concat(start.getFullYear(), "-").concat(String(start.getMonth() + 1).padStart(2, "0"), "-").concat(String(start.getDate()).padStart(2, "0"));
                        }
                        // Update user document
                        var userRef = (0, firestore_1.doc)(firebaseConfig_1.db, "users", userDoc.id);
                        batch.update(userRef, {
                            streak: streak,
                            streakStartDate: streakStartDate,
                            activeDays: uniqueDays,
                            lastActive: (0, firestore_1.serverTimestamp)(),
                        });
                    });
                    return [4 /*yield*/, batch.commit()];
                case 2:
                    _a.sent();
                    console.log("✅ Recalculated streaks for all users");
                    return [2 /*return*/];
            }
        });
    });
}
// Run the migration when this file is executed directly
if (require.main === module) {
    recalculateAllStreaks().catch(console.error);
}
