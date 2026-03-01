; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

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
push DE                        ; 0116: D5
push IX                        ; 0117: DD E5
pop HL                         ; 0119: E1
ld DE, $0004                   ; 011A: 11 04 00
add HL, DE                     ; 011D: 19
pop DE                         ; 011E: D1
pop DE                         ; 011F: D1
add HL, DE                     ; 0120: 19
push HL                        ; 0121: E5
pop HL                         ; 0122: E1
ld B, (hl)                     ; 0123: 46
ex DE, HL                      ; 0124: EB
ld E, (IX + $0006)             ; 0125: DD 5E 06
ld D, (IX + $0007)             ; 0128: DD 56 07
ex DE, HL                      ; 012B: EB
push HL                        ; 012C: E5
pop HL                         ; 012D: E1
push HL                        ; 012E: E5
push DE                        ; 012F: D5
push IX                        ; 0130: DD E5
pop HL                         ; 0132: E1
ld DE, $0004                   ; 0133: 11 04 00
add HL, DE                     ; 0136: 19
pop DE                         ; 0137: D1
pop DE                         ; 0138: D1
add HL, DE                     ; 0139: 19
push HL                        ; 013A: E5
pop HL                         ; 013B: E1
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
; func byte_fvar_reg end
; func main begin
main:
push IX                        ; 0148: DD E5
ld IX, $0000                   ; 014A: DD 21 00 00
add IX, SP                     ; 014E: DD 39
push AF                        ; 0150: F5
push BC                        ; 0151: C5
push DE                        ; 0152: D5
push HL                        ; 0153: E5
ld HL, $0001                   ; 0154: 21 01 00
push HL                        ; 0157: E5
ld HL, glob_bytes              ; 0158: 21 00 00
push HL                        ; 015B: E5
call byte_fvar_reg             ; 015C: CD 00 00
inc SP                         ; 015F: 33
inc SP                         ; 0160: 33
inc SP                         ; 0161: 33
inc SP                         ; 0162: 33
__zax_epilogue_1:
pop HL                         ; 0163: E1
pop DE                         ; 0164: D1
pop BC                         ; 0165: C1
pop AF                         ; 0166: F1
ld SP, IX                      ; 0167: DD F9
pop IX                         ; 0169: DD E1
ret                            ; 016B: C9
; func main end

; symbols:
; label byte_fvar_reg = $0100
; label __zax_epilogue_0 = $0140
; label main = $0148
; label __zax_epilogue_1 = $0163
; data glob_bytes = $2000
