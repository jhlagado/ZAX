; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_glob_reg begin
byte_glob_reg:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ex DE, HL                      ; 010E: EB
ld E, (IX + $0004)             ; 010F: DD 5E 04
ld D, (IX + $0005)             ; 0112: DD 56 05
ex DE, HL                      ; 0115: EB
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
push HL                        ; 0118: E5
ld HL, glob_bytes              ; 0119: 21 00 00
pop DE                         ; 011C: D1
add HL, DE                     ; 011D: 19
push HL                        ; 011E: E5
pop HL                         ; 011F: E1
pop DE                         ; 0120: D1
pop BC                         ; 0121: C1
pop AF                         ; 0122: F1
ld B, (hl)                     ; 0123: 46
push AF                        ; 0124: F5
push BC                        ; 0125: C5
push DE                        ; 0126: D5
ex DE, HL                      ; 0127: EB
ld E, (IX + $0004)             ; 0128: DD 5E 04
ld D, (IX + $0005)             ; 012B: DD 56 05
ex DE, HL                      ; 012E: EB
push HL                        ; 012F: E5
pop HL                         ; 0130: E1
push HL                        ; 0131: E5
ld HL, glob_bytes              ; 0132: 21 00 00
pop DE                         ; 0135: D1
add HL, DE                     ; 0136: 19
push HL                        ; 0137: E5
pop HL                         ; 0138: E1
pop DE                         ; 0139: D1
pop BC                         ; 013A: C1
pop AF                         ; 013B: F1
ld (hl), B                     ; 013C: 70
ld H, $0000                    ; 013D: 26 00
ld L, B                        ; 013F: 68
__zax_epilogue_0:
pop DE                         ; 0140: D1
pop BC                         ; 0141: C1
pop AF                         ; 0142: F1
ld SP, IX                      ; 0143: DD F9
pop IX                         ; 0145: DD E1
ret                            ; 0147: C9
; func byte_glob_reg end
; func main begin
main:
push IX                        ; 0148: DD E5
ld IX, $0000                   ; 014A: DD 21 00 00
add IX, SP                     ; 014E: DD 39
push AF                        ; 0150: F5
push BC                        ; 0151: C5
push DE                        ; 0152: D5
push HL                        ; 0153: E5
ld HL, $0003                   ; 0154: 21 03 00
push HL                        ; 0157: E5
call byte_glob_reg             ; 0158: CD 00 00
inc SP                         ; 015B: 33
inc SP                         ; 015C: 33
__zax_epilogue_1:
pop HL                         ; 015D: E1
pop DE                         ; 015E: D1
pop BC                         ; 015F: C1
pop AF                         ; 0160: F1
ld SP, IX                      ; 0161: DD F9
pop IX                         ; 0163: DD E1
ret                            ; 0165: C9
; func main end

; symbols:
; label byte_glob_reg = $0100
; label __zax_epilogue_0 = $0140
; label main = $0148
; label __zax_epilogue_1 = $015D
; data glob_bytes = $2000
; label __zax_startup = $2008
