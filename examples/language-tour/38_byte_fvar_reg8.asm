; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_reg begin
byte_fvar_reg:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0006)             ; 010C: DD 5E 06
ld D, (IX + $0007)             ; 010F: DD 56 07
ex DE, HL                      ; 0112: EB
push HL                        ; 0113: E5
pop HL                         ; 0114: E1
push HL                        ; 0115: E5
ld E, (IX + $0004)             ; 0116: DD 5E 04
ld D, (IX + $0005)             ; 0119: DD 56 05
ex DE, HL                      ; 011C: EB
pop DE                         ; 011D: D1
add HL, DE                     ; 011E: 19
push HL                        ; 011F: E5
pop HL                         ; 0120: E1
ld B, (hl)                     ; 0121: 46
ex DE, HL                      ; 0122: EB
ld E, (IX + $0006)             ; 0123: DD 5E 06
ld D, (IX + $0007)             ; 0126: DD 56 07
ex DE, HL                      ; 0129: EB
push HL                        ; 012A: E5
pop HL                         ; 012B: E1
push HL                        ; 012C: E5
ld E, (IX + $0004)             ; 012D: DD 5E 04
ld D, (IX + $0005)             ; 0130: DD 56 05
ex DE, HL                      ; 0133: EB
pop DE                         ; 0134: D1
add HL, DE                     ; 0135: 19
push HL                        ; 0136: E5
pop HL                         ; 0137: E1
ld (hl), B                     ; 0138: 70
ld H, $0000                    ; 0139: 26 00
ld L, B                        ; 013B: 68
__zax_epilogue_0:
pop DE                         ; 013C: D1
pop BC                         ; 013D: C1
pop AF                         ; 013E: F1
ld SP, IX                      ; 013F: DD F9
pop IX                         ; 0141: DD E1
ret                            ; 0143: C9
; func byte_fvar_reg end
; func main begin
main:
push IX                        ; 0144: DD E5
ld IX, $0000                   ; 0146: DD 21 00 00
add IX, SP                     ; 014A: DD 39
push AF                        ; 014C: F5
push BC                        ; 014D: C5
push DE                        ; 014E: D5
push HL                        ; 014F: E5
ld HL, $0001                   ; 0150: 21 01 00
push HL                        ; 0153: E5
ld HL, glob_bytes              ; 0154: 21 00 00
push HL                        ; 0157: E5
call byte_fvar_reg             ; 0158: CD 00 00
inc SP                         ; 015B: 33
inc SP                         ; 015C: 33
inc SP                         ; 015D: 33
inc SP                         ; 015E: 33
__zax_epilogue_1:
pop HL                         ; 015F: E1
pop DE                         ; 0160: D1
pop BC                         ; 0161: C1
pop AF                         ; 0162: F1
ld SP, IX                      ; 0163: DD F9
pop IX                         ; 0165: DD E1
ret                            ; 0167: C9
; func main end

; symbols:
; label byte_fvar_reg = $0100
; label __zax_epilogue_0 = $013C
; label main = $0144
; label __zax_epilogue_1 = $015F
; data glob_bytes = $2000
; label __zax_startup = $2008
