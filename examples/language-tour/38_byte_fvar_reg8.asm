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
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ex DE, HL                      ; 010E: EB
ld E, (IX + $0006)             ; 010F: DD 5E 06
ld D, (IX + $0007)             ; 0112: DD 56 07
ex DE, HL                      ; 0115: EB
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
push HL                        ; 0118: E5
ld E, (IX + $0004)             ; 0119: DD 5E 04
ld D, (IX + $0005)             ; 011C: DD 56 05
ex DE, HL                      ; 011F: EB
pop DE                         ; 0120: D1
add HL, DE                     ; 0121: 19
push HL                        ; 0122: E5
pop HL                         ; 0123: E1
pop DE                         ; 0124: D1
pop BC                         ; 0125: C1
pop AF                         ; 0126: F1
ld B, (hl)                     ; 0127: 46
push AF                        ; 0128: F5
push BC                        ; 0129: C5
push DE                        ; 012A: D5
ex DE, HL                      ; 012B: EB
ld E, (IX + $0006)             ; 012C: DD 5E 06
ld D, (IX + $0007)             ; 012F: DD 56 07
ex DE, HL                      ; 0132: EB
push HL                        ; 0133: E5
pop HL                         ; 0134: E1
push HL                        ; 0135: E5
ld E, (IX + $0004)             ; 0136: DD 5E 04
ld D, (IX + $0005)             ; 0139: DD 56 05
ex DE, HL                      ; 013C: EB
pop DE                         ; 013D: D1
add HL, DE                     ; 013E: 19
push HL                        ; 013F: E5
pop HL                         ; 0140: E1
pop DE                         ; 0141: D1
pop BC                         ; 0142: C1
pop AF                         ; 0143: F1
ld (hl), B                     ; 0144: 70
ld H, $0000                    ; 0145: 26 00
ld L, B                        ; 0147: 68
__zax_epilogue_0:
pop DE                         ; 0148: D1
pop BC                         ; 0149: C1
pop AF                         ; 014A: F1
ld SP, IX                      ; 014B: DD F9
pop IX                         ; 014D: DD E1
ret                            ; 014F: C9
; func byte_fvar_reg end
; func main begin
main:
push IX                        ; 0150: DD E5
ld IX, $0000                   ; 0152: DD 21 00 00
add IX, SP                     ; 0156: DD 39
push AF                        ; 0158: F5
push BC                        ; 0159: C5
push DE                        ; 015A: D5
push HL                        ; 015B: E5
ld HL, $0001                   ; 015C: 21 01 00
push HL                        ; 015F: E5
ld HL, glob_bytes              ; 0160: 21 00 00
push HL                        ; 0163: E5
call byte_fvar_reg             ; 0164: CD 00 00
inc SP                         ; 0167: 33
inc SP                         ; 0168: 33
inc SP                         ; 0169: 33
inc SP                         ; 016A: 33
__zax_epilogue_1:
pop HL                         ; 016B: E1
pop DE                         ; 016C: D1
pop BC                         ; 016D: C1
pop AF                         ; 016E: F1
ld SP, IX                      ; 016F: DD F9
pop IX                         ; 0171: DD E1
ret                            ; 0173: C9
; func main end

; symbols:
; label byte_fvar_reg = $0100
; label __zax_epilogue_0 = $0148
; label main = $0150
; label __zax_epilogue_1 = $016B
; data glob_bytes = $2000
; label __zax_startup = $2008
