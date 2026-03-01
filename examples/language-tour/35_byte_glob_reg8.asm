; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_glob_reg begin
byte_glob_reg:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ex DE, HL                      ; 0112: EB
push HL                        ; 0113: E5
pop HL                         ; 0114: E1
push HL                        ; 0115: E5
ld HL, glob_bytes              ; 0116: 21 00 00
pop DE                         ; 0119: D1
add HL, DE                     ; 011A: 19
push HL                        ; 011B: E5
pop HL                         ; 011C: E1
ld B, (hl)                     ; 011D: 46
ex DE, HL                      ; 011E: EB
ld E, (IX + $0004)             ; 011F: DD 5E 04
ld D, (IX + $0005)             ; 0122: DD 56 05
ex DE, HL                      ; 0125: EB
push HL                        ; 0126: E5
pop HL                         ; 0127: E1
push HL                        ; 0128: E5
ld HL, glob_bytes              ; 0129: 21 00 00
pop DE                         ; 012C: D1
add HL, DE                     ; 012D: 19
push HL                        ; 012E: E5
pop HL                         ; 012F: E1
ld (hl), B                     ; 0130: 70
ld H, $0000                    ; 0131: 26 00
ld L, B                        ; 0133: 68
__zax_epilogue_0:
pop DE                         ; 0134: D1
pop BC                         ; 0135: C1
pop AF                         ; 0136: F1
ld SP, IX                      ; 0137: DD F9
pop IX                         ; 0139: DD E1
ret                            ; 013B: C9
; func byte_glob_reg end
; func main begin
main:
push IX                        ; 013C: DD E5
ld IX, $0000                   ; 013E: DD 21 00 00
add IX, SP                     ; 0142: DD 39
push AF                        ; 0144: F5
push BC                        ; 0145: C5
push DE                        ; 0146: D5
push HL                        ; 0147: E5
ld HL, $0003                   ; 0148: 21 03 00
push HL                        ; 014B: E5
call byte_glob_reg             ; 014C: CD 00 00
inc SP                         ; 014F: 33
inc SP                         ; 0150: 33
__zax_epilogue_1:
pop HL                         ; 0151: E1
pop DE                         ; 0152: D1
pop BC                         ; 0153: C1
pop AF                         ; 0154: F1
ld SP, IX                      ; 0155: DD F9
pop IX                         ; 0157: DD E1
ret                            ; 0159: C9
; func main end

; symbols:
; label byte_glob_reg = $0100
; label __zax_epilogue_0 = $0134
; label main = $013C
; label __zax_epilogue_1 = $0151
; data glob_bytes = $2000
