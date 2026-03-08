; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_glob_fvar begin
byte_glob_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
push HL                        ; 010C: E5
ld de, glob_bytes              ; 010D: 11 00 00
ex DE, HL                      ; 0110: EB
ld E, (IX + $0004)             ; 0111: DD 5E 04
ld D, (IX + $0005)             ; 0114: DD 56 05
ex DE, HL                      ; 0117: EB
add HL, DE                     ; 0118: 19
ld A, (HL)                     ; 0119: 7E
pop HL                         ; 011A: E1
pop DE                         ; 011B: D1
push DE                        ; 011C: D5
push HL                        ; 011D: E5
ld de, glob_bytes              ; 011E: 11 00 00
ex DE, HL                      ; 0121: EB
ld E, (IX + $0004)             ; 0122: DD 5E 04
ld D, (IX + $0005)             ; 0125: DD 56 05
ex DE, HL                      ; 0128: EB
add HL, DE                     ; 0129: 19
ld (HL), A                     ; 012A: 77
pop HL                         ; 012B: E1
pop DE                         ; 012C: D1
ld H, $0000                    ; 012D: 26 00
ld L, A                        ; 012F: 6F
__zax_epilogue_0:
pop DE                         ; 0130: D1
pop BC                         ; 0131: C1
pop AF                         ; 0132: F1
ld SP, IX                      ; 0133: DD F9
pop IX                         ; 0135: DD E1
ret                            ; 0137: C9
; func byte_glob_fvar end
; func main begin
main:
push IX                        ; 0138: DD E5
ld IX, $0000                   ; 013A: DD 21 00 00
add IX, SP                     ; 013E: DD 39
push AF                        ; 0140: F5
push BC                        ; 0141: C5
push DE                        ; 0142: D5
push HL                        ; 0143: E5
ld HL, $0002                   ; 0144: 21 02 00
push HL                        ; 0147: E5
call byte_glob_fvar            ; 0148: CD 00 00
inc SP                         ; 014B: 33
inc SP                         ; 014C: 33
__zax_epilogue_1:
pop HL                         ; 014D: E1
pop DE                         ; 014E: D1
pop BC                         ; 014F: C1
pop AF                         ; 0150: F1
ld SP, IX                      ; 0151: DD F9
pop IX                         ; 0153: DD E1
ret                            ; 0155: C9
; func main end

; symbols:
; label byte_glob_fvar = $0100
; label __zax_epilogue_0 = $0130
; label main = $0138
; label __zax_epilogue_1 = $014D
; data glob_bytes = $2000
; label __zax_startup = $2008
