; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_fvar_fvar begin
byte_fvar_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld e, (ix+$06)                 ; 010B: DD 5E 06
ld d, (ix+$07)                 ; 010E: DD 56 07
ex de, hl                      ; 0111: EB
push HL                        ; 0112: E5
pop HL                         ; 0113: E1
push HL                        ; 0114: E5
push DE                        ; 0115: D5
push IX                        ; 0116: DD E5
pop HL                         ; 0118: E1
ld DE, $0004                   ; 0119: 11 04 00
add HL, DE                     ; 011C: 19
pop DE                         ; 011D: D1
pop DE                         ; 011E: D1
add HL, DE                     ; 011F: 19
push HL                        ; 0120: E5
pop HL                         ; 0121: E1
ld A, (hl)                     ; 0122: 7E
push AF                        ; 0123: F5
ld e, (ix+$06)                 ; 0124: DD 5E 06
ld d, (ix+$07)                 ; 0127: DD 56 07
ex de, hl                      ; 012A: EB
push HL                        ; 012B: E5
pop HL                         ; 012C: E1
push HL                        ; 012D: E5
push DE                        ; 012E: D5
push IX                        ; 012F: DD E5
pop HL                         ; 0131: E1
ld DE, $0004                   ; 0132: 11 04 00
add HL, DE                     ; 0135: 19
pop DE                         ; 0136: D1
pop DE                         ; 0137: D1
add HL, DE                     ; 0138: 19
push HL                        ; 0139: E5
pop HL                         ; 013A: E1
ld (hl), A                     ; 013B: 77
pop AF                         ; 013C: F1
ld H, $0000                    ; 013D: 26 00
ld L, A                        ; 013F: 6F
__zax_epilogue_0:
pop DE                         ; 0140: D1
pop BC                         ; 0141: C1
pop AF                         ; 0142: F1
ld SP, IX                      ; 0143: DD F9
pop IX                         ; 0145: DD E1
ret                            ; 0147: C9
; func byte_fvar_fvar end
; func main begin
main:
push IX                        ; 0148: DD E5
ld IX, $0000                   ; 014A: DD 21 00 00
add IX, SP                     ; 014E: DD 39
push AF                        ; 0150: F5
push BC                        ; 0151: C5
push DE                        ; 0152: D5
push HL                        ; 0153: E5
ld HL, $0005                   ; 0154: 21 05 00
push HL                        ; 0157: E5
ld HL, glob_bytes              ; 0158: 21 00 00
push HL                        ; 015B: E5
call byte_fvar_fvar            ; 015C: CD 00 00
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
; label byte_fvar_fvar = $0100
; label __zax_epilogue_0 = $0140
; label main = $0148
; label __zax_epilogue_1 = $0163
; data glob_bytes = $2000
