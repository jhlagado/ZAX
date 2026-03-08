; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_reg16 begin
byte_fvar_reg16:
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
push AF                        ; 0113: F5
push BC                        ; 0114: C5
push DE                        ; 0115: D5
ex DE, HL                      ; 0116: EB
push DE                        ; 0117: D5
push IX                        ; 0118: DD E5
pop HL                         ; 011A: E1
ld DE, $0004                   ; 011B: 11 04 00
add HL, DE                     ; 011E: 19
pop DE                         ; 011F: D1
add HL, DE                     ; 0120: 19
push HL                        ; 0121: E5
pop HL                         ; 0122: E1
pop DE                         ; 0123: D1
pop BC                         ; 0124: C1
pop AF                         ; 0125: F1
ld A, (hl)                     ; 0126: 7E
push AF                        ; 0127: F5
push AF                        ; 0128: F5
push BC                        ; 0129: C5
push DE                        ; 012A: D5
ex DE, HL                      ; 012B: EB
push DE                        ; 012C: D5
push IX                        ; 012D: DD E5
pop HL                         ; 012F: E1
ld DE, $0004                   ; 0130: 11 04 00
add HL, DE                     ; 0133: 19
pop DE                         ; 0134: D1
add HL, DE                     ; 0135: 19
push HL                        ; 0136: E5
pop HL                         ; 0137: E1
pop DE                         ; 0138: D1
pop BC                         ; 0139: C1
pop AF                         ; 013A: F1
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
; func byte_fvar_reg16 end
; func main begin
main:
push IX                        ; 0148: DD E5
ld IX, $0000                   ; 014A: DD 21 00 00
add IX, SP                     ; 014E: DD 39
push AF                        ; 0150: F5
push BC                        ; 0151: C5
push DE                        ; 0152: D5
push HL                        ; 0153: E5
ld HL, $0006                   ; 0154: 21 06 00
push HL                        ; 0157: E5
ld HL, glob_bytes              ; 0158: 21 00 00
push HL                        ; 015B: E5
call byte_fvar_reg16           ; 015C: CD 00 00
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
; label byte_fvar_reg16 = $0100
; label __zax_epilogue_0 = $0140
; label main = $0148
; label __zax_epilogue_1 = $0163
; data glob_bytes = $2000
; label __zax_startup = $2008
